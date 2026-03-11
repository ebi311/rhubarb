import { STAFF_SHIFT_INTERVAL_MINUTES } from '@/backend/constants';
import { ClientStaffAssignmentRepository } from '@/backend/repositories/clientStaffAssignmentRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import {
	ClientDatetimeChangeInput,
	ClientDatetimeChangeInputSchema,
	ShiftAdjustmentOperation,
	ShiftAdjustmentRationaleItem,
	ShiftAdjustmentSuggestion,
	ShiftSnapshot,
	StaffAbsenceInput,
} from '@/models/shiftAdjustmentActionSchemas';
import { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import {
	addJstDays,
	formatJstDateString,
	getJstDateOnly,
	parseJstDateString,
	setJstTime,
} from '@/utils/date';
import type { SupabaseClient } from '@supabase/supabase-js';

export class ServiceError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

interface ShiftAdjustmentSuggestionServiceOptions {
	staffRepository?: StaffRepository;
	shiftRepository?: ShiftRepository;
	clientStaffAssignmentRepository?: ClientStaffAssignmentRepository;
	maxExecutionMs?: number;
	now?: () => number;
}

export type SuggestClientDatetimeChangeAdjustmentsOutput = {
	meta?: {
		timedOut?: boolean;
	};
	change: ClientDatetimeChangeInput;
	target: {
		shift: ShiftSnapshot;
		suggestions: ShiftAdjustmentSuggestion[];
	};
};

export type FindAvailableHelpersInput = {
	date: string; // YYYY-MM-DD
	startTime: { hour: number; minute: number };
	endTime: { hour: number; minute: number };
	clientId?: string; // オプション。指定時はその利用者に割当可能なスタッフに絞る
	serviceTypeId?: ServiceTypeId; // オプション。clientId 指定時はこちらも必須
};

export type AvailableHelper = {
	id: string;
	name: string;
};

// ======================================
// processStaffAbsence 関連の型定義
// ======================================

/**
 * 代替候補スタッフ
 */
export type StaffCandidate = {
	staffId: string;
	staffName: string;
	/** 優先順位の理由: past_assigned = 過去に担当, assigned = 割当可能（担当経験なし）, available = 空き時間あり */
	priority: 'past_assigned' | 'assigned' | 'available';
};

/**
 * 影響シフトとその代替候補
 */
export type AffectedShiftWithCandidates = {
	shift: ShiftSnapshot;
	candidates: StaffCandidate[];
};

/**
 * processStaffAbsence の戻り値
 */
export type StaffAbsenceProcessResult = {
	absenceStaffId: string;
	absenceStaffName: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	affectedShifts: AffectedShiftWithCandidates[];
	/** AI が読む用のサマリー */
	summary: string;
};

const isOverlapping = (
	a: { start: Date; end: Date },
	b: { start: Date; end: Date },
): boolean => {
	// [start, end) の重なり
	return a.start < b.end && b.start < a.end;
};

/**
 * インターバル（移動時間）を考慮した重なり判定
 *
 * 【重要】このロジックは以下と同一条件で判定しています：
 * - ShiftService.hasTimeOverlap
 * - ShiftRepository.findConflictingShifts
 *
 * 数学的に同値: A の終了 + interval > B の開始 && B の終了 + interval > A の開始
 * ⇔ A.start < B.end + interval && B.start < A.end + interval
 *
 * @param request 要求された時間帯
 * @param existing 既存のシフト時間帯
 * @returns 重なりがあるかどうか
 */
const isOverlappingWithInterval = (
	request: { start: Date; end: Date },
	existing: { start: Date; end: Date },
): boolean => {
	const intervalMs = STAFF_SHIFT_INTERVAL_MINUTES * 60 * 1000;
	// 既存シフト終了後 + インターバル時間の間に要求が開始するか
	const existingEndWithInterval = new Date(existing.end.getTime() + intervalMs);
	// 要求シフト終了後 + インターバル時間の間に既存が開始するか
	const requestEndWithInterval = new Date(request.end.getTime() + intervalMs);

	return (
		request.start < existingEndWithInterval &&
		existing.start < requestEndWithInterval
	);
};

const toShiftSnapshot = (shift: {
	id: string;
	client_id: string;
	service_type_id: ServiceTypeId;
	staff_id?: string | null;
	date: Date;
	time: {
		start: { hour: number; minute: number };
		end: { hour: number; minute: number };
	};
	status: 'scheduled' | 'confirmed' | 'completed' | 'canceled';
}): ShiftSnapshot => ({
	id: shift.id,
	client_id: shift.client_id,
	service_type_id: shift.service_type_id,
	staff_id: shift.staff_id ?? null,
	date: shift.date,
	start_time: shift.time.start,
	end_time: shift.time.end,
	status: shift.status,
});

type ScheduledShift = Parameters<typeof toShiftSnapshot>[0];
type StaffShiftsByStaff = Map<
	string,
	{ shiftId: string; start: Date; end: Date }[]
>;
type AssignableStaffMap = Map<string, Set<string>>;

type OfficeStaff = Awaited<ReturnType<StaffRepository['listByOffice']>>[number];

export class ShiftAdjustmentSuggestionService {
	private staffRepository: StaffRepository;
	private shiftRepository: ShiftRepository;
	private clientStaffAssignmentRepository: ClientStaffAssignmentRepository;
	private maxExecutionMs: number;
	private now: () => number;

	constructor(
		private supabase: SupabaseClient<Database>,
		options: ShiftAdjustmentSuggestionServiceOptions = {},
	) {
		const {
			staffRepository = new StaffRepository(this.supabase),
			shiftRepository = new ShiftRepository(this.supabase),
			clientStaffAssignmentRepository = new ClientStaffAssignmentRepository(
				this.supabase,
			),
			maxExecutionMs = 8000,
			now = () => Date.now(),
		} = options;

		this.staffRepository = staffRepository;
		this.shiftRepository = shiftRepository;
		this.clientStaffAssignmentRepository = clientStaffAssignmentRepository;
		this.maxExecutionMs = maxExecutionMs;
		this.now = now;
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	private buildRationale(_params: {
		serviceTypeOk: true;
		noConflict: true;
	}): ShiftAdjustmentRationaleItem[] {
		return [
			{ code: 'service_type_ok', message: 'サービス種別適性あり' },
			{ code: 'no_conflict', message: '時間重複なし' },
		];
	}

	private buildSuggestion(params: {
		operations: ShiftAdjustmentOperation[];
		rationale: ShiftAdjustmentRationaleItem[];
	}): ShiftAdjustmentSuggestion {
		return {
			operations: params.operations,
			rationale: params.rationale,
		};
	}

	private buildChangeStaffOperation(params: {
		shiftId: string;
		fromStaffId: string;
		toStaffId: string;
	}): ShiftAdjustmentOperation {
		return {
			type: 'change_staff',
			shift_id: params.shiftId,
			from_staff_id: params.fromStaffId,
			to_staff_id: params.toStaffId,
		};
	}

	private buildUpdateShiftScheduleOperation(params: {
		shiftId: string;
		newDate: Date;
		newStartTime: { hour: number; minute: number };
		newEndTime: { hour: number; minute: number };
	}): ShiftAdjustmentOperation {
		return {
			type: 'update_shift_schedule',
			shift_id: params.shiftId,
			new_date: params.newDate,
			new_start_time: params.newStartTime,
			new_end_time: params.newEndTime,
		};
	}

	private assignmentKey(params: {
		clientId: string;
		serviceTypeId: ServiceTypeId;
	}): string {
		return `${params.clientId}|${params.serviceTypeId}`;
	}

	private validateClientDatetimeChange = (
		change: ClientDatetimeChangeInput,
	): ClientDatetimeChangeInput => {
		const parsedChange = ClientDatetimeChangeInputSchema.safeParse(change);
		if (!parsedChange.success) {
			throw new ServiceError(
				400,
				'Validation error',
				parsedChange.error.issues,
			);
		}

		return parsedChange.data;
	};

	private createTimeoutChecker = (): {
		checkTimeout: () => boolean;
		isTimedOut: () => boolean;
	} => {
		const startedAt = this.now();
		let timedOut = false;
		const checkTimeout = () => {
			if (this.now() - startedAt > this.maxExecutionMs) {
				timedOut = true;
				return true;
			}
			return false;
		};

		return { checkTimeout, isTimedOut: () => timedOut };
	};

	private buildCandidates = (params: {
		staffs: OfficeStaff[];
		absentStaffId: string;
	}): OfficeStaff[] => {
		return params.staffs
			.filter((staff) => staff.id !== params.absentStaffId)
			.filter((staff) => staff.role === 'helper')
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
	};

	private getShiftDateTimes = (
		shift: ScheduledShift,
	): { start: Date; end: Date } => {
		const start = setJstTime(
			shift.date,
			shift.time.start.hour,
			shift.time.start.minute,
		);
		const end = setJstTime(
			shift.date,
			shift.time.end.hour,
			shift.time.end.minute,
		);

		return { start, end };
	};

	private buildShiftsByStaff = (
		shifts: ScheduledShift[],
	): StaffShiftsByStaff => {
		const shiftsByStaff: StaffShiftsByStaff = new Map();

		for (const shift of shifts) {
			if (!shift.staff_id) continue;

			const { start, end } = this.getShiftDateTimes(shift);
			const list = shiftsByStaff.get(shift.staff_id) ?? [];
			list.push({ shiftId: shift.id, start, end });
			shiftsByStaff.set(shift.staff_id, list);
		}

		return shiftsByStaff;
	};

	/**
	 * 日付ごとにグループ化されたMapから、指定日付の前後1日のシフトを取得
	 * O(1)でアクセスし、O(n)のfilterを回避
	 */
	private getShiftsForDateRange = (
		shiftsByDate: Map<string, ScheduledShift[]>,
		targetDate: Date,
	): ScheduledShift[] => {
		const result: ScheduledShift[] = [];
		for (let delta = -1; delta <= 1; delta++) {
			const date = addJstDays(targetDate, delta);
			const dateKey = formatJstDateString(date);
			const shifts = shiftsByDate.get(dateKey);
			if (shifts) {
				result.push(...shifts);
			}
		}
		return result;
	};

	private buildAssignableStaffMap = async (params: {
		officeId: string;
		shifts: ScheduledShift[];
	}): Promise<AssignableStaffMap> => {
		const clientIds = Array.from(
			new Set(params.shifts.map((shift) => shift.client_id)),
		);
		if (clientIds.length === 0) {
			return new Map();
		}

		const assignmentLinks =
			await this.clientStaffAssignmentRepository.listLinksByOfficeAndClientIds(
				params.officeId,
				clientIds,
			);

		const assignableStaffMap: AssignableStaffMap = new Map();
		for (const link of assignmentLinks) {
			const key = this.assignmentKey({
				clientId: link.client_id,
				serviceTypeId: link.service_type_id,
			});
			const staffSet = assignableStaffMap.get(key) ?? new Set<string>();
			staffSet.add(link.staff_id);
			assignableStaffMap.set(key, staffSet);
		}

		return assignableStaffMap;
	};

	private canAssignStaffToShift = (params: {
		shift: ScheduledShift;
		staffId: string;
		assignableStaffMap: AssignableStaffMap;
	}): boolean => {
		return (
			params.assignableStaffMap
				.get(
					this.assignmentKey({
						clientId: params.shift.client_id,
						serviceTypeId: params.shift.service_type_id,
					}),
				)
				?.has(params.staffId) ?? false
		);
	};

	private canAssignByClientAndServiceType = (params: {
		assignableStaffMap: AssignableStaffMap;
		staffId: string;
		clientId: string;
		serviceTypeId: ServiceTypeId;
	}): boolean => {
		return (
			params.assignableStaffMap
				.get(
					this.assignmentKey({
						clientId: params.clientId,
						serviceTypeId: params.serviceTypeId,
					}),
				)
				?.has(params.staffId) ?? false
		);
	};

	private getScheduledShiftWithStaffOrThrow = async (
		shiftId: string,
	): Promise<ScheduledShift> => {
		const targetShift = await this.shiftRepository.findById(shiftId);
		if (!targetShift) throw new ServiceError(404, 'Shift not found');
		if (targetShift.status !== 'scheduled') {
			throw new ServiceError(400, 'Shift must be scheduled');
		}
		if (!targetShift.staff_id) {
			throw new ServiceError(400, 'Shift must have staff_id');
		}
		return targetShift;
	};

	private assertShiftInOffice = async (params: {
		officeId: string;
		targetShift: ScheduledShift;
	}): Promise<void> => {
		const sameOfficeShifts = await this.shiftRepository.list({
			officeId: params.officeId,
			startDate: params.targetShift.date,
			endDate: params.targetShift.date,
			clientId: params.targetShift.client_id,
		});
		if (!sameOfficeShifts.some((s) => s.id === params.targetShift.id)) {
			throw new ServiceError(404, 'Shift not found');
		}
	};

	private buildRangeOnDate = (params: {
		date: Date;
		startTime: { hour: number; minute: number };
		endTime: { hour: number; minute: number };
	}): { start: Date; end: Date } => {
		const start = setJstTime(
			getJstDateOnly(params.date),
			params.startTime.hour,
			params.startTime.minute,
		);
		const end = setJstTime(
			getJstDateOnly(params.date),
			params.endTime.hour,
			params.endTime.minute,
		);
		return { start, end };
	};

	private hasConflictForRange = (params: {
		shiftsByStaff: StaffShiftsByStaff;
		staffId: string;
		range: { start: Date; end: Date };
	}): boolean => {
		const staffShifts = params.shiftsByStaff.get(params.staffId) ?? [];
		return staffShifts.some((s) =>
			isOverlapping(params.range, { start: s.start, end: s.end }),
		);
	};

	/**
	 * インターバル（移動時間）を考慮した重複チェック
	 * STAFF_SHIFT_INTERVAL_MINUTES を使用し、ShiftRepository.findConflictingShifts と同一条件
	 */
	private hasConflictForRangeWithInterval = (params: {
		shiftsByStaff: StaffShiftsByStaff;
		staffId: string;
		range: { start: Date; end: Date };
	}): boolean => {
		const staffShifts = params.shiftsByStaff.get(params.staffId) ?? [];
		return staffShifts.some((s) =>
			isOverlappingWithInterval(params.range, { start: s.start, end: s.end }),
		);
	};

	private addDepth0SameStaffSuggestion = (params: {
		suggestions: ShiftAdjustmentSuggestion[];
		targetShift: ScheduledShift;
		currentStaff: OfficeStaff;
		validatedChange: ClientDatetimeChangeInput;
		range: { start: Date; end: Date };
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		checkTimeout: () => boolean;
	}): void => {
		if (params.checkTimeout()) return;
		const serviceTypeOk = params.currentStaff.service_type_ids.includes(
			params.targetShift.service_type_id,
		);
		if (!serviceTypeOk) return;
		const assignable = this.canAssignByClientAndServiceType({
			assignableStaffMap: params.assignableStaffMap,
			staffId: params.currentStaff.id,
			clientId: params.targetShift.client_id,
			serviceTypeId: params.targetShift.service_type_id,
		});
		if (!assignable) return;
		const conflict = this.hasConflictForRange({
			shiftsByStaff: params.shiftsByStaff,
			staffId: params.currentStaff.id,
			range: params.range,
		});
		if (conflict) return;

		params.suggestions.push(
			this.buildSuggestion({
				operations: [
					this.buildUpdateShiftScheduleOperation({
						shiftId: params.targetShift.id,
						newDate: params.validatedChange.newDate,
						newStartTime: params.validatedChange.newStartTime,
						newEndTime: params.validatedChange.newEndTime,
					}),
				],
				rationale: this.buildRationale({
					serviceTypeOk: true,
					noConflict: true,
				}),
			}),
		);
	};

	private addDepth0ChangeStaffSuggestions = (params: {
		suggestions: ShiftAdjustmentSuggestion[];
		targetShift: ScheduledShift;
		currentStaff: OfficeStaff;
		validatedChange: ClientDatetimeChangeInput;
		range: { start: Date; end: Date };
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		checkTimeout: () => boolean;
	}): void => {
		for (const candidate of params.candidates) {
			if (params.checkTimeout()) return;
			if (
				!candidate.service_type_ids.includes(params.targetShift.service_type_id)
			) {
				continue;
			}
			if (
				!this.canAssignByClientAndServiceType({
					assignableStaffMap: params.assignableStaffMap,
					staffId: candidate.id,
					clientId: params.targetShift.client_id,
					serviceTypeId: params.targetShift.service_type_id,
				})
			) {
				continue;
			}
			if (
				this.hasConflictForRange({
					shiftsByStaff: params.shiftsByStaff,
					staffId: candidate.id,
					range: params.range,
				})
			) {
				continue;
			}

			params.suggestions.push(
				this.buildSuggestion({
					operations: [
						this.buildChangeStaffOperation({
							shiftId: params.targetShift.id,
							fromStaffId: params.currentStaff.id,
							toStaffId: candidate.id,
						}),
						this.buildUpdateShiftScheduleOperation({
							shiftId: params.targetShift.id,
							newDate: params.validatedChange.newDate,
							newStartTime: params.validatedChange.newStartTime,
							newEndTime: params.validatedChange.newEndTime,
						}),
					],
					rationale: this.buildRationale({
						serviceTypeOk: true,
						noConflict: true,
					}),
				}),
			);
			if (params.suggestions.length >= 3) return;
		}
	};

	private findSingleConflictShiftForRange = (params: {
		shiftById: Map<string, ScheduledShift>;
		shiftsByStaff: StaffShiftsByStaff;
		staffId: string;
		range: { start: Date; end: Date };
	}): ScheduledShift | null => {
		const staffShifts = params.shiftsByStaff.get(params.staffId) ?? [];
		const conflicts = staffShifts.filter((s) =>
			isOverlapping(params.range, { start: s.start, end: s.end }),
		);
		if (conflicts.length !== 1) return null;

		const conflictShift = params.shiftById.get(conflicts[0]!.shiftId);
		if (!conflictShift) return null;
		if (conflictShift.staff_id !== params.staffId) return null;
		return conflictShift;
	};

	private addDepth1BumpConflictSuggestions = (params: {
		suggestions: ShiftAdjustmentSuggestion[];
		targetShift: ScheduledShift;
		currentStaff: OfficeStaff;
		validatedChange: ClientDatetimeChangeInput;
		range: { start: Date; end: Date };
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		shiftById: Map<string, ScheduledShift>;
		checkTimeout: () => boolean;
	}): void => {
		if (params.checkTimeout()) return;
		const conflictShift = this.findSingleConflictShiftForRange({
			shiftById: params.shiftById,
			shiftsByStaff: params.shiftsByStaff,
			staffId: params.currentStaff.id,
			range: params.range,
		});
		if (!conflictShift) return;
		const { start: conflictStart, end: conflictEnd } =
			this.getShiftDateTimes(conflictShift);

		for (const candidateC of params.candidates) {
			if (params.checkTimeout()) return;
			if (
				!candidateC.service_type_ids.includes(conflictShift.service_type_id)
			) {
				continue;
			}
			if (
				!this.canAssignByClientAndServiceType({
					assignableStaffMap: params.assignableStaffMap,
					staffId: candidateC.id,
					clientId: conflictShift.client_id,
					serviceTypeId: conflictShift.service_type_id,
				})
			) {
				continue;
			}
			if (
				this.hasConflictForRange({
					shiftsByStaff: params.shiftsByStaff,
					staffId: candidateC.id,
					range: { start: conflictStart, end: conflictEnd },
				})
			) {
				continue;
			}

			params.suggestions.push(
				this.buildSuggestion({
					operations: [
						this.buildChangeStaffOperation({
							shiftId: conflictShift.id,
							fromStaffId: params.currentStaff.id,
							toStaffId: candidateC.id,
						}),
						this.buildUpdateShiftScheduleOperation({
							shiftId: params.targetShift.id,
							newDate: params.validatedChange.newDate,
							newStartTime: params.validatedChange.newStartTime,
							newEndTime: params.validatedChange.newEndTime,
						}),
					],
					rationale: this.buildRationale({
						serviceTypeOk: true,
						noConflict: true,
					}),
				}),
			);
			if (params.suggestions.length >= 3) return;
		}
	};

	async suggestClientDatetimeChangeAdjustments(
		userId: string,
		change: ClientDatetimeChangeInput,
	): Promise<SuggestClientDatetimeChangeAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const { checkTimeout, isTimedOut } = this.createTimeoutChecker();
		const validatedChange = this.validateClientDatetimeChange(change);

		const officeId = adminStaff.office_id;
		const targetShift = await this.getScheduledShiftWithStaffOrThrow(
			validatedChange.shiftId,
		);
		await this.assertShiftInOffice({ officeId, targetShift });

		const [staffs, scheduledShiftsOnNewDate] = await Promise.all([
			this.staffRepository.listByOffice(officeId),
			this.shiftRepository.list({
				officeId,
				startDate: validatedChange.newDate,
				endDate: validatedChange.newDate,
				status: 'scheduled',
			}),
		]);

		const currentStaff = staffs.find((s) => s.id === targetShift.staff_id);
		if (!currentStaff) throw new ServiceError(404, 'Staff not found');
		const range = this.buildRangeOnDate({
			date: validatedChange.newDate,
			startTime: validatedChange.newStartTime,
			endTime: validatedChange.newEndTime,
		});
		const shiftsByStaff = this.buildShiftsByStaff(
			scheduledShiftsOnNewDate.filter((s) => s.id !== targetShift.id),
		);
		const assignableStaffMap = await this.buildAssignableStaffMap({
			officeId,
			shifts: [targetShift, ...scheduledShiftsOnNewDate],
		});
		const candidates = this.buildCandidates({
			staffs,
			absentStaffId: currentStaff.id,
		});
		const shiftById: Map<string, ScheduledShift> = new Map(
			scheduledShiftsOnNewDate.map((s) => [s.id, s]),
		);

		const suggestions: ShiftAdjustmentSuggestion[] = [];

		// 深さ0: staff維持で日時変更（update_shift_schedule のみ）
		this.addDepth0SameStaffSuggestion({
			suggestions,
			targetShift,
			currentStaff,
			validatedChange,
			range,
			assignableStaffMap,
			shiftsByStaff,
			checkTimeout,
		});

		// 深さ0: staff変更で解決（change_staff -> update_shift_schedule）
		if (suggestions.length === 0) {
			this.addDepth0ChangeStaffSuggestions({
				suggestions,
				targetShift,
				currentStaff,
				validatedChange,
				range,
				candidates,
				assignableStaffMap,
				shiftsByStaff,
				checkTimeout,
			});
		}

		// 深さ1: staff維持のまま、衝突シフトを玉突き（change_staff -> update_shift_schedule）
		if (suggestions.length === 0) {
			this.addDepth1BumpConflictSuggestions({
				suggestions,
				targetShift,
				currentStaff,
				validatedChange,
				range,
				candidates,
				assignableStaffMap,
				shiftsByStaff,
				shiftById,
				checkTimeout,
			});
		}

		return {
			...(isTimedOut() ? { meta: { timedOut: true } } : {}),
			change: validatedChange,
			target: {
				shift: toShiftSnapshot(targetShift),
				suggestions,
			},
		};
	}

	/**
	 * 指定した時間帯に空きのあるヘルパーを検索する
	 * @param officeId 事業所ID
	 * @param input 検索条件
	 * @returns 空きヘルパー一覧（最大5人、名前順）
	 */
	async findAvailableHelpers(
		officeId: string,
		input: FindAvailableHelpersInput,
	): Promise<AvailableHelper[]> {
		const MAX_RESULTS = 5;

		// clientId 指定時は serviceTypeId も必須
		if (input.clientId && !input.serviceTypeId) {
			throw new ServiceError(400, 'clientId 指定時は serviceTypeId も必須です');
		}

		// 事業所のスタッフ一覧を取得
		const staffs = await this.staffRepository.listByOffice(officeId);

		// ヘルパーのみ抽出（admin は除外）
		const helpers = staffs
			.filter((staff) => staff.role === 'helper')
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

		// 日付をパース
		const targetDate = parseJstDateString(input.date);

		// 指定日とその前後1日のシフトを取得
		// 日付境界付近（23:30のシフトと翌日0:00のシフト）の衝突を正しく検出するため
		const shiftsOnDate = await this.shiftRepository.list({
			officeId,
			startDate: addJstDays(targetDate, -1),
			endDate: addJstDays(targetDate, 1),
			excludeStatus: 'canceled',
		});

		// スタッフごとのシフトをマップ化
		const shiftsByStaff = this.buildShiftsByStaff(shiftsOnDate);

		// 指定時間帯の範囲を計算
		const range = this.buildRangeOnDate({
			date: targetDate,
			startTime: input.startTime,
			endTime: input.endTime,
		});

		// clientId が指定されている場合、割当可能なスタッフIDを取得
		const assignableStaffIds = await this.getAssignableStaffIds(
			officeId,
			input.clientId,
			input.serviceTypeId,
		);

		// 空きヘルパーをフィルタリング
		const availableHelpers: AvailableHelper[] = [];
		for (const helper of helpers) {
			const isEligible = this.isHelperEligibleForRange({
				helper,
				assignableStaffIds,
				serviceTypeId: input.serviceTypeId,
				shiftsByStaff,
				range,
			});
			if (!isEligible) continue;

			availableHelpers.push({
				id: helper.id,
				name: helper.name,
			});

			// 最大5人まで
			if (availableHelpers.length >= MAX_RESULTS) {
				break;
			}
		}

		return availableHelpers;
	}

	/**
	 * クライアントに割当可能なスタッフIDのセットを取得する
	 */
	private getAssignableStaffIds = async (
		officeId: string,
		clientId: string | undefined,
		serviceTypeId: ServiceTypeId | undefined,
	): Promise<Set<string> | null> => {
		if (!clientId) return null;

		const assignmentLinks =
			await this.clientStaffAssignmentRepository.listLinksByOfficeAndClientIds(
				officeId,
				[clientId],
			);
		// serviceTypeId でフィルタして、その (client_id, service_type_id) に割当可能なスタッフに絞る
		const filteredLinks = serviceTypeId
			? assignmentLinks.filter((l) => l.service_type_id === serviceTypeId)
			: assignmentLinks;
		return new Set(filteredLinks.map((l) => l.staff_id));
	};

	/**
	 * ヘルパーが指定された条件で対応可能かどうかをチェックする
	 */
	private isHelperEligibleForRange = (params: {
		helper: OfficeStaff;
		assignableStaffIds: Set<string> | null;
		serviceTypeId: ServiceTypeId | undefined;
		shiftsByStaff: StaffShiftsByStaff;
		range: { start: Date; end: Date };
	}): boolean => {
		const { helper, assignableStaffIds, serviceTypeId, shiftsByStaff, range } =
			params;

		// clientId 指定時は割当可能かチェック
		if (assignableStaffIds && !assignableStaffIds.has(helper.id)) {
			return false;
		}

		// serviceTypeId 指定時はスタッフの対応可能サービス種別をチェック
		if (serviceTypeId && !helper.service_type_ids.includes(serviceTypeId)) {
			return false;
		}

		// 時間重複がないかチェック（インターバル考慮）
		const hasConflict = this.hasConflictForRangeWithInterval({
			shiftsByStaff,
			staffId: helper.id,
			range,
		});
		return !hasConflict;
	};

	/**
	 * スタッフ急休の処理
	 * 影響シフトを特定し、各シフトに対する代替候補を取得する
	 */
	async processStaffAbsence(
		userId: string,
		input: StaffAbsenceInput,
	): Promise<StaffAbsenceProcessResult> {
		const MAX_CANDIDATES = 3;
		const MAX_PARALLEL_CANDIDATE_QUERIES = 10;

		// 管理者権限チェック
		const admin = await this.getAdminStaff(userId);

		// 欠勤スタッフの存在と同一事業所チェック
		const absenceStaff = await this.staffRepository.findById(input.staffId);
		if (!absenceStaff || absenceStaff.office_id !== admin.office_id) {
			throw new ServiceError(404, 'Absence staff not found');
		}

		const officeId = admin.office_id;
		const startDate = input.startDate;
		const endDate = input.endDate;

		// 影響シフトを取得
		const affectedShifts =
			await this.shiftRepository.findAffectedShiftsByAbsence(
				input.staffId,
				startDate,
				endDate,
				officeId,
			);

		// 影響シフトがない場合は早期リターン
		if (affectedShifts.length === 0) {
			return {
				absenceStaffId: input.staffId,
				absenceStaffName: absenceStaff.name,
				startDate: formatJstDateString(startDate),
				endDate: formatJstDateString(endDate),
				affectedShifts: [],
				summary: `影響シフト: 0件`,
			};
		}

		// 事業所のスタッフ一覧を取得（候補検索用）
		const officeStaffs = await this.staffRepository.listByOffice(officeId);
		const staffMap = new Map(officeStaffs.map((s) => [s.id, s]));

		// 欠勤期間のシフトを一度だけ取得（N+1対策：前後1日のバッファを含む）
		const allShiftsInPeriod = await this.shiftRepository.list({
			officeId,
			startDate: addJstDays(startDate, -1),
			endDate: addJstDays(endDate, 1),
			excludeStatus: 'canceled',
		});

		// 日付ごとにシフトをグループ化（findCandidatesForShift での O(n) フィルタリングを回避）
		const shiftsByDate = new Map<string, ScheduledShift[]>();
		for (const s of allShiftsInPeriod) {
			const dateKey = formatJstDateString(s.date);
			const existing = shiftsByDate.get(dateKey) ?? [];
			existing.push(s);
			shiftsByDate.set(dateKey, existing);
		}

		// (client_id, service_type_id) ペアの重複を排除して過去担当/割当スタッフを一括取得（N+1対策）
		const uniqueClientServicePairs = [
			...new Map(
				affectedShifts.map((s) => [
					`${s.client_id}:${s.service_type_id}`,
					{ clientId: s.client_id, serviceTypeId: s.service_type_id },
				]),
			).values(),
		];

		// 過去担当者と割当スタッフを並列で取得してキャッシュ
		const [pastStaffResults, assignedStaffResults] = await Promise.all([
			Promise.all(
				uniqueClientServicePairs.map(async ({ clientId, serviceTypeId }) => ({
					key: `${clientId}:${serviceTypeId}`,
					staffIds: await this.shiftRepository.findPastAssignedStaffIdsByClient(
						clientId,
						officeId,
						serviceTypeId,
						MAX_CANDIDATES,
					),
				})),
			),
			Promise.all(
				uniqueClientServicePairs.map(async ({ clientId, serviceTypeId }) => ({
					key: `${clientId}:${serviceTypeId}`,
					staffIds:
						await this.clientStaffAssignmentRepository.findAssignedStaffIdsByClient(
							officeId,
							clientId,
							serviceTypeId,
						),
				})),
			),
		]);

		// キャッシュ Map を作成
		const pastStaffCache = new Map(
			pastStaffResults.map((r) => [r.key, r.staffIds]),
		);
		const assignedStaffCache = new Map(
			assignedStaffResults.map((r) => [r.key, r.staffIds]),
		);

		// 各影響シフトに対して代替候補を検索（バッチ並列化: DB接続負荷を制限）
		const affectedShiftsWithCandidates: AffectedShiftWithCandidates[] = [];

		for (
			let i = 0;
			i < affectedShifts.length;
			i += MAX_PARALLEL_CANDIDATE_QUERIES
		) {
			const batch = affectedShifts.slice(i, i + MAX_PARALLEL_CANDIDATE_QUERIES);
			const batchResults = await Promise.all(
				batch.map(async (shift) => {
					const candidates = this.findCandidatesForShift({
						shift,
						absenceStaffId: input.staffId,
						staffMap,
						maxCandidates: MAX_CANDIDATES,
						shiftsByDate,
						pastStaffCache,
						assignedStaffCache,
					});

					return {
						shift: toShiftSnapshot(shift),
						candidates,
					};
				}),
			);
			affectedShiftsWithCandidates.push(...batchResults);
		}

		// 候補なしの件数をカウント
		const noCandidatesCount = affectedShiftsWithCandidates.filter(
			(a) => a.candidates.length === 0,
		).length;

		return {
			absenceStaffId: input.staffId,
			absenceStaffName: absenceStaff.name,
			startDate: formatJstDateString(startDate),
			endDate: formatJstDateString(endDate),
			affectedShifts: affectedShiftsWithCandidates,
			summary:
				`影響シフト: ${affectedShifts.length}件` +
				(noCandidatesCount > 0 ? `, 候補なし: ${noCandidatesCount}件` : ''),
		};
	}

	/**
	 * スタッフリストから候補を抽出（空き状況チェック付き）
	 */
	private extractCandidatesFromStaffIds = (params: {
		staffIds: string[];
		staffMap: Map<string, OfficeStaff>;
		shiftsByStaff: StaffShiftsByStaff;
		range: { start: Date; end: Date };
		serviceTypeId: ServiceTypeId;
		maxCandidates: number;
		currentCount: number;
		priority: StaffCandidate['priority'];
	}): StaffCandidate[] => {
		const {
			staffIds,
			staffMap,
			shiftsByStaff,
			range,
			serviceTypeId,
			maxCandidates,
			currentCount,
			priority,
		} = params;
		const candidates: StaffCandidate[] = [];
		let count = currentCount;

		for (const staffId of staffIds) {
			if (count >= maxCandidates) break;

			const staff = staffMap.get(staffId);
			if (!staff || staff.role !== 'helper') continue;
			if (!staff.service_type_ids.includes(serviceTypeId)) continue;

			const hasConflict = this.hasConflictForRangeWithInterval({
				shiftsByStaff,
				staffId,
				range,
			});
			if (hasConflict) continue;

			candidates.push({ staffId, staffName: staff.name, priority });
			count++;
		}
		return candidates;
	};

	/**
	 * 単一シフトに対する代替候補を検索（キャッシュ使用、同期処理）
	 */
	private findCandidatesForShift = (params: {
		shift: ScheduledShift;
		absenceStaffId: string;
		staffMap: Map<string, OfficeStaff>;
		maxCandidates: number;
		shiftsByDate: Map<string, ScheduledShift[]>;
		pastStaffCache: Map<string, string[]>;
		assignedStaffCache: Map<string, string[]>;
	}): StaffCandidate[] => {
		const {
			shift,
			absenceStaffId,
			staffMap,
			maxCandidates,
			shiftsByDate,
			pastStaffCache,
			assignedStaffCache,
		} = params;

		// キャッシュから過去担当者と割当スタッフを取得
		const cacheKey = `${shift.client_id}:${shift.service_type_id}`;
		const pastStaffIds = pastStaffCache.get(cacheKey) ?? [];
		const assignedStaffIds = assignedStaffCache.get(cacheKey) ?? [];

		// 過去担当者（欠勤者除外）
		const pastAssignedStaffIds = pastStaffIds.filter(
			(id) => id !== absenceStaffId,
		);
		// 割当可能だが担当経験なし（欠勤者除外）
		const assignedOnlyStaffIds = assignedStaffIds.filter(
			(id) => id !== absenceStaffId && !pastStaffIds.includes(id),
		);

		// 時間帯と空き状況チェック用のデータを準備
		const range = this.buildRangeOnDate({
			date: shift.date,
			startTime: shift.time.start,
			endTime: shift.time.end,
		});
		const shiftsNearDate = this.getShiftsForDateRange(shiftsByDate, shift.date);
		const shiftsByStaff = this.buildShiftsByStaff(shiftsNearDate);

		const candidates: StaffCandidate[] = [];

		// 1. 過去担当者から候補抽出（past_assigned 優先）
		candidates.push(
			...this.extractCandidatesFromStaffIds({
				staffIds: pastAssignedStaffIds,
				staffMap,
				shiftsByStaff,
				range,
				serviceTypeId: shift.service_type_id,
				maxCandidates,
				currentCount: candidates.length,
				priority: 'past_assigned',
			}),
		);

		// 2. 割当可能スタッフから候補抽出（assigned 優先）
		candidates.push(
			...this.extractCandidatesFromStaffIds({
				staffIds: assignedOnlyStaffIds,
				staffMap,
				shiftsByStaff,
				range,
				serviceTypeId: shift.service_type_id,
				maxCandidates,
				currentCount: candidates.length,
				priority: 'assigned',
			}),
		);

		// 3. 候補が足りなければ全ヘルパーから検索（available）
		if (candidates.length < maxCandidates) {
			const excludeIds = new Set([
				absenceStaffId,
				...pastAssignedStaffIds,
				...assignedOnlyStaffIds,
				...candidates.map((c) => c.staffId),
			]);

			const availableHelpers = Array.from(staffMap.values())
				.filter((staff) => {
					if (excludeIds.has(staff.id)) return false;
					if (staff.role !== 'helper') return false;
					if (!staff.service_type_ids.includes(shift.service_type_id))
						return false;
					return !this.hasConflictForRangeWithInterval({
						shiftsByStaff,
						staffId: staff.id,
						range,
					});
				})
				.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

			for (const staff of availableHelpers) {
				if (candidates.length >= maxCandidates) break;
				candidates.push({
					staffId: staff.id,
					staffName: staff.name,
					priority: 'available',
				});
			}
		}

		return candidates;
	};
}
