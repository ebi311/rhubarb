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
	StaffAbsenceInputSchema,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { getJstDateOnly, setJstTime } from '@/utils/date';
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

const isOverlapping = (
	a: { start: Date; end: Date },
	b: { start: Date; end: Date },
): boolean => {
	// [start, end) の重なり
	return a.start < b.end && b.start < a.end;
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
		options?: ShiftAdjustmentSuggestionServiceOptions,
	) {
		this.staffRepository =
			options?.staffRepository ?? new StaffRepository(this.supabase);
		this.shiftRepository =
			options?.shiftRepository ?? new ShiftRepository(this.supabase);
		this.clientStaffAssignmentRepository =
			options?.clientStaffAssignmentRepository ??
			new ClientStaffAssignmentRepository(this.supabase);
		this.maxExecutionMs = options?.maxExecutionMs ?? 8000;
		this.now = options?.now ?? (() => Date.now());
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

	private validateAbsence = (absence: StaffAbsenceInput): StaffAbsenceInput => {
		const parsedAbsence = StaffAbsenceInputSchema.safeParse(absence);
		if (!parsedAbsence.success) {
			throw new ServiceError(
				400,
				'Validation error',
				parsedAbsence.error.issues,
			);
		}

		return parsedAbsence.data;
	};

	private resolveStartDateTime = (startDate: Date): Date => {
		const todayJst = getJstDateOnly(new Date());
		const todayStart = setJstTime(todayJst, 0, 0);
		const rangeStart = setJstTime(getJstDateOnly(startDate), 0, 0);
		return rangeStart > todayStart ? rangeStart : todayStart;
	};

	private filterScheduledShifts = (params: {
		scheduledShifts: ScheduledShift[];
		startDateTime: Date;
	}): ScheduledShift[] => {
		return params.scheduledShifts.filter((shift) => {
			if (shift.status !== 'scheduled') return false;
			const { start } = this.getShiftDateTimes(shift);
			return start >= params.startDateTime;
		});
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

	private buildDepth0Suggestions = (params: {
		shift: ScheduledShift;
		absentStaffId: string;
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		maxSuggestions: number;
		checkTimeout?: () => boolean;
	}): ShiftAdjustmentSuggestion[] => {
		const { start: shiftStart, end: shiftEnd } = this.getShiftDateTimes(
			params.shift,
		);
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidate of params.candidates) {
			if (params.checkTimeout?.()) break;
			if (!candidate.service_type_ids.includes(params.shift.service_type_id))
				continue;
			if (
				!this.canAssignStaffToShift({
					shift: params.shift,
					staffId: candidate.id,
					assignableStaffMap: params.assignableStaffMap,
				})
			) {
				continue;
			}

			const candidateShifts = params.shiftsByStaff.get(candidate.id) ?? [];
			const hasConflict = candidateShifts.some((scheduledShift) =>
				isOverlapping(
					{ start: shiftStart, end: shiftEnd },
					{ start: scheduledShift.start, end: scheduledShift.end },
				),
			);
			if (hasConflict) continue;

			suggestions.push(
				this.buildSuggestion({
					operations: [
						this.buildChangeStaffOperation({
							shiftId: params.shift.id,
							fromStaffId: params.absentStaffId,
							toStaffId: candidate.id,
						}),
					],
					rationale: this.buildRationale({
						serviceTypeOk: true,
						noConflict: true,
					}),
				}),
			);

			if (suggestions.length >= params.maxSuggestions) break;
		}

		return suggestions;
	};

	private findSingleConflictShift = (params: {
		shift: ScheduledShift;
		candidateId: string;
		shiftsByStaff: StaffShiftsByStaff;
		shiftById: Map<string, ScheduledShift>;
	}): ScheduledShift | null => {
		const { start: shiftStart, end: shiftEnd } = this.getShiftDateTimes(
			params.shift,
		);
		const candidateShifts = params.shiftsByStaff.get(params.candidateId) ?? [];
		const conflicts = candidateShifts.filter((scheduledShift) =>
			isOverlapping(
				{ start: shiftStart, end: shiftEnd },
				{ start: scheduledShift.start, end: scheduledShift.end },
			),
		);
		if (conflicts.length !== 1) return null;

		const conflictShift = params.shiftById.get(conflicts[0]!.shiftId);
		if (!conflictShift || conflictShift.staff_id !== params.candidateId)
			return null;

		return conflictShift;
	};

	private canUseCandidateForConflictShift = (params: {
		candidateId: string;
		conflictShift: ScheduledShift;
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
	}): boolean => {
		if (
			!this.canAssignStaffToShift({
				shift: params.conflictShift,
				staffId: params.candidateId,
				assignableStaffMap: params.assignableStaffMap,
			})
		) {
			return false;
		}

		const { start: conflictStart, end: conflictEnd } = this.getShiftDateTimes(
			params.conflictShift,
		);
		const candidateShifts = params.shiftsByStaff.get(params.candidateId) ?? [];

		return !candidateShifts.some((scheduledShift) =>
			isOverlapping(
				{ start: conflictStart, end: conflictEnd },
				{ start: scheduledShift.start, end: scheduledShift.end },
			),
		);
	};

	private buildDepth1Suggestions = (params: {
		shift: ScheduledShift;
		absentStaffId: string;
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		shiftById: Map<string, ScheduledShift>;
		maxSuggestions: number;
		checkTimeout?: () => boolean;
	}): ShiftAdjustmentSuggestion[] => {
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidateB of params.candidates) {
			if (params.checkTimeout?.()) return suggestions;
			if (!candidateB.service_type_ids.includes(params.shift.service_type_id))
				continue;
			if (
				!this.canAssignStaffToShift({
					shift: params.shift,
					staffId: candidateB.id,
					assignableStaffMap: params.assignableStaffMap,
				})
			) {
				continue;
			}

			const conflictShift = this.findSingleConflictShift({
				shift: params.shift,
				candidateId: candidateB.id,
				shiftsByStaff: params.shiftsByStaff,
				shiftById: params.shiftById,
			});
			if (!conflictShift) continue;

			for (const candidateC of params.candidates) {
				if (params.checkTimeout?.()) return suggestions;
				if (candidateC.id === candidateB.id) continue;
				if (
					!candidateC.service_type_ids.includes(conflictShift.service_type_id)
				) {
					continue;
				}
				if (
					!this.canUseCandidateForConflictShift({
						candidateId: candidateC.id,
						conflictShift,
						assignableStaffMap: params.assignableStaffMap,
						shiftsByStaff: params.shiftsByStaff,
					})
				)
					continue;

				suggestions.push(
					this.buildSuggestion({
						operations: [
							this.buildChangeStaffOperation({
								shiftId: conflictShift.id,
								fromStaffId: candidateB.id,
								toStaffId: candidateC.id,
							}),
							this.buildChangeStaffOperation({
								shiftId: params.shift.id,
								fromStaffId: params.absentStaffId,
								toStaffId: candidateB.id,
							}),
						],
						rationale: this.buildRationale({
							serviceTypeOk: true,
							noConflict: true,
						}),
					}),
				);

				if (suggestions.length >= params.maxSuggestions) return suggestions;
			}
		}

		return suggestions;
	};

	private buildSuggestionsForShift = (params: {
		shift: ScheduledShift;
		absentStaffId: string;
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		shiftById: Map<string, ScheduledShift>;
		maxSuggestions: number;
		checkTimeout?: () => boolean;
	}): ShiftAdjustmentSuggestion[] => {
		const depth0Suggestions = this.buildDepth0Suggestions({
			shift: params.shift,
			absentStaffId: params.absentStaffId,
			candidates: params.candidates,
			assignableStaffMap: params.assignableStaffMap,
			shiftsByStaff: params.shiftsByStaff,
			maxSuggestions: params.maxSuggestions,
			checkTimeout: params.checkTimeout,
		});
		if (depth0Suggestions.length > 0) return depth0Suggestions;

		return this.buildDepth1Suggestions({
			shift: params.shift,
			absentStaffId: params.absentStaffId,
			candidates: params.candidates,
			assignableStaffMap: params.assignableStaffMap,
			shiftsByStaff: params.shiftsByStaff,
			shiftById: params.shiftById,
			maxSuggestions: params.maxSuggestions,
			checkTimeout: params.checkTimeout,
		});
	};

	async suggestShiftAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);

		const startedAt = this.now();
		let timedOut = false;
		const checkTimeout = () => {
			if (this.now() - startedAt > this.maxExecutionMs) {
				timedOut = true;
				return true;
			}
			return false;
		};

		const validatedAbsence = this.validateAbsence(absence);

		const officeId = adminStaff.office_id;
		const startDateTime = this.resolveStartDateTime(validatedAbsence.startDate);

		const [staffs, scheduledShifts] = await Promise.all([
			this.staffRepository.listByOffice(officeId),
			this.shiftRepository.list({
				officeId,
				startDate: validatedAbsence.startDate,
				endDate: validatedAbsence.endDate,
				status: 'scheduled',
				startDateTime,
			}),
		]);

		const _absentStaff = staffs.find((s) => s.id === validatedAbsence.staffId);
		if (!_absentStaff) throw new ServiceError(404, 'Staff not found');

		const filteredScheduledShifts = this.filterScheduledShifts({
			scheduledShifts,
			startDateTime,
		});
		const candidates = this.buildCandidates({
			staffs,
			absentStaffId: validatedAbsence.staffId,
		});
		const shiftsByStaff = this.buildShiftsByStaff(filteredScheduledShifts);

		const affectedShifts = filteredScheduledShifts.filter(
			(s) => s.staff_id === validatedAbsence.staffId,
		);
		const assignableStaffMap = await this.buildAssignableStaffMap({
			officeId,
			shifts: filteredScheduledShifts,
		});
		const shiftById = new Map(filteredScheduledShifts.map((s) => [s.id, s]));

		const affected: SuggestShiftAdjustmentsOutput['affected'] = [];
		for (const shift of affectedShifts) {
			if (checkTimeout()) break;
			const suggestions = this.buildSuggestionsForShift({
				shift,
				absentStaffId: validatedAbsence.staffId,
				candidates,
				assignableStaffMap,
				shiftsByStaff,
				shiftById,
				maxSuggestions: 3,
				checkTimeout,
			});
			affected.push({ shift: toShiftSnapshot(shift), suggestions });
		}

		return {
			...(timedOut ? { meta: { timedOut: true } } : {}),
			absence: validatedAbsence,
			affected,
		};
	}

	async suggestClientDatetimeChangeAdjustments(
		userId: string,
		change: ClientDatetimeChangeInput,
	): Promise<SuggestClientDatetimeChangeAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);

		const startedAt = this.now();
		let timedOut = false;
		const checkTimeout = () => {
			if (this.now() - startedAt > this.maxExecutionMs) {
				timedOut = true;
				return true;
			}
			return false;
		};

		const parsedChange = ClientDatetimeChangeInputSchema.safeParse(change);
		if (!parsedChange.success) {
			throw new ServiceError(
				400,
				'Validation error',
				parsedChange.error.issues,
			);
		}
		const validatedChange = parsedChange.data;

		const officeId = adminStaff.office_id;

		const targetShift = await this.shiftRepository.findById(
			validatedChange.shiftId,
		);
		if (!targetShift) throw new ServiceError(404, 'Shift not found');
		if (targetShift.status !== 'scheduled') {
			throw new ServiceError(400, 'Shift must be scheduled');
		}
		if (!targetShift.staff_id) {
			throw new ServiceError(400, 'Shift must have staff_id');
		}

		// office 境界チェック（ShiftRepository.findById は office を join しないため）
		const sameOfficeShifts = await this.shiftRepository.list({
			officeId,
			startDate: targetShift.date,
			endDate: targetShift.date,
			clientId: targetShift.client_id,
		});
		if (!sameOfficeShifts.some((s) => s.id === targetShift.id)) {
			throw new ServiceError(404, 'Shift not found');
		}

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

		const newStart = setJstTime(
			getJstDateOnly(validatedChange.newDate),
			validatedChange.newStartTime.hour,
			validatedChange.newStartTime.minute,
		);
		const newEnd = setJstTime(
			getJstDateOnly(validatedChange.newDate),
			validatedChange.newEndTime.hour,
			validatedChange.newEndTime.minute,
		);

		const shiftsByStaff = new Map<
			string,
			{ shiftId: string; start: Date; end: Date }[]
		>();
		for (const shift of scheduledShiftsOnNewDate) {
			if (!shift.staff_id) continue;
			if (shift.id === targetShift.id) continue;

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
			const list = shiftsByStaff.get(shift.staff_id) ?? [];
			list.push({ shiftId: shift.id, start, end });
			shiftsByStaff.set(shift.staff_id, list);
		}

		const clientIds = Array.from(
			new Set([
				targetShift.client_id,
				...scheduledShiftsOnNewDate.map((s) => s.client_id),
			]),
		);
		const assignmentLinks =
			clientIds.length === 0
				? []
				: await this.clientStaffAssignmentRepository.listLinksByOfficeAndClientIds(
						officeId,
						clientIds,
					);
		const assignableStaffMap = new Map<string, Set<string>>();
		for (const link of assignmentLinks) {
			const key = this.assignmentKey({
				clientId: link.client_id,
				serviceTypeId: link.service_type_id,
			});
			const set = assignableStaffMap.get(key) ?? new Set<string>();
			set.add(link.staff_id);
			assignableStaffMap.set(key, set);
		}

		const candidates = staffs
			.filter((s) => s.role === 'helper')
			.filter((s) => s.id !== currentStaff.id)
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

		const canAssign = (params: {
			staffId: string;
			clientId: string;
			serviceTypeId: ServiceTypeId;
		}) =>
			assignableStaffMap
				.get(
					this.assignmentKey({
						clientId: params.clientId,
						serviceTypeId: params.serviceTypeId,
					}),
				)
				?.has(params.staffId) ?? false;

		const hasConflict = (
			staffId: string,
			range: { start: Date; end: Date },
		) => {
			const staffShifts = shiftsByStaff.get(staffId) ?? [];
			return staffShifts.some((s) =>
				isOverlapping(range, { start: s.start, end: s.end }),
			);
		};

		const suggestions: ShiftAdjustmentSuggestion[] = [];

		// 深さ0: staff維持で日時変更（update_shift_schedule のみ）
		if (!checkTimeout()) {
			const serviceTypeOk = currentStaff.service_type_ids.includes(
				targetShift.service_type_id,
			);
			const assignable = canAssign({
				staffId: currentStaff.id,
				clientId: targetShift.client_id,
				serviceTypeId: targetShift.service_type_id,
			});
			if (serviceTypeOk && assignable) {
				const conflict = hasConflict(currentStaff.id, {
					start: newStart,
					end: newEnd,
				});
				if (!conflict) {
					suggestions.push(
						this.buildSuggestion({
							operations: [
								this.buildUpdateShiftScheduleOperation({
									shiftId: targetShift.id,
									newDate: validatedChange.newDate,
									newStartTime: validatedChange.newStartTime,
									newEndTime: validatedChange.newEndTime,
								}),
							],
							rationale: this.buildRationale({
								serviceTypeOk: true,
								noConflict: true,
							}),
						}),
					);
				}
			}
		}

		// 深さ0: staff変更で解決（change_staff -> update_shift_schedule）
		if (suggestions.length === 0) {
			for (const candidate of candidates) {
				if (checkTimeout()) break;
				if (!candidate.service_type_ids.includes(targetShift.service_type_id)) {
					continue;
				}
				if (
					!canAssign({
						staffId: candidate.id,
						clientId: targetShift.client_id,
						serviceTypeId: targetShift.service_type_id,
					})
				) {
					continue;
				}
				if (
					hasConflict(candidate.id, {
						start: newStart,
						end: newEnd,
					})
				) {
					continue;
				}

				suggestions.push(
					this.buildSuggestion({
						operations: [
							this.buildChangeStaffOperation({
								shiftId: targetShift.id,
								fromStaffId: currentStaff.id,
								toStaffId: candidate.id,
							}),
							this.buildUpdateShiftScheduleOperation({
								shiftId: targetShift.id,
								newDate: validatedChange.newDate,
								newStartTime: validatedChange.newStartTime,
								newEndTime: validatedChange.newEndTime,
							}),
						],
						rationale: this.buildRationale({
							serviceTypeOk: true,
							noConflict: true,
						}),
					}),
				);
				if (suggestions.length >= 3) break;
			}
		}

		// 深さ1: staff維持のまま、衝突シフトを玉突き（change_staff -> update_shift_schedule）
		if (suggestions.length === 0 && !checkTimeout()) {
			const staffShifts = shiftsByStaff.get(currentStaff.id) ?? [];
			const conflicts = staffShifts.filter((s) =>
				isOverlapping(
					{ start: newStart, end: newEnd },
					{ start: s.start, end: s.end },
				),
			);
			if (conflicts.length === 1) {
				const shiftById = new Map(
					scheduledShiftsOnNewDate.map((s) => [s.id, s]),
				);
				const conflictShift = shiftById.get(conflicts[0]!.shiftId);
				if (conflictShift && conflictShift.staff_id === currentStaff.id) {
					const conflictStart = setJstTime(
						conflictShift.date,
						conflictShift.time.start.hour,
						conflictShift.time.start.minute,
					);
					const conflictEnd = setJstTime(
						conflictShift.date,
						conflictShift.time.end.hour,
						conflictShift.time.end.minute,
					);

					for (const candidateC of candidates) {
						if (checkTimeout()) break;
						if (
							!candidateC.service_type_ids.includes(
								conflictShift.service_type_id,
							)
						) {
							continue;
						}
						if (
							!canAssign({
								staffId: candidateC.id,
								clientId: conflictShift.client_id,
								serviceTypeId: conflictShift.service_type_id,
							})
						) {
							continue;
						}
						if (
							hasConflict(candidateC.id, {
								start: conflictStart,
								end: conflictEnd,
							})
						) {
							continue;
						}

						suggestions.push(
							this.buildSuggestion({
								operations: [
									this.buildChangeStaffOperation({
										shiftId: conflictShift.id,
										fromStaffId: currentStaff.id,
										toStaffId: candidateC.id,
									}),
									this.buildUpdateShiftScheduleOperation({
										shiftId: targetShift.id,
										newDate: validatedChange.newDate,
										newStartTime: validatedChange.newStartTime,
										newEndTime: validatedChange.newEndTime,
									}),
								],
								rationale: this.buildRationale({
									serviceTypeOk: true,
									noConflict: true,
								}),
							}),
						);
						if (suggestions.length >= 3) break;
					}
				}
			}
		}

		return {
			...(timedOut ? { meta: { timedOut: true } } : {}),
			change: validatedChange,
			target: {
				shift: toShiftSnapshot(targetShift),
				suggestions,
			},
		};
	}
}
