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

	private canCandidateTakeShift = (params: {
		candidate: OfficeStaff;
		shift: ScheduledShift;
		assignableStaffMap: AssignableStaffMap;
	}): boolean => {
		if (
			!params.candidate.service_type_ids.includes(params.shift.service_type_id)
		) {
			return false;
		}
		return this.canAssignStaffToShift({
			shift: params.shift,
			staffId: params.candidate.id,
			assignableStaffMap: params.assignableStaffMap,
		});
	};

	private appendDepth1SuggestionsForCandidateB = (params: {
		suggestions: ShiftAdjustmentSuggestion[];
		shift: ScheduledShift;
		absentStaffId: string;
		candidateB: OfficeStaff;
		conflictShift: ScheduledShift;
		candidates: OfficeStaff[];
		assignableStaffMap: AssignableStaffMap;
		shiftsByStaff: StaffShiftsByStaff;
		maxSuggestions: number;
		checkTimeout?: () => boolean;
	}): void => {
		for (const candidateC of params.candidates) {
			if (params.checkTimeout?.()) return;
			if (candidateC.id === params.candidateB.id) continue;
			if (
				!candidateC.service_type_ids.includes(
					params.conflictShift.service_type_id,
				)
			) {
				continue;
			}
			if (
				!this.canUseCandidateForConflictShift({
					candidateId: candidateC.id,
					conflictShift: params.conflictShift,
					assignableStaffMap: params.assignableStaffMap,
					shiftsByStaff: params.shiftsByStaff,
				})
			) {
				continue;
			}

			params.suggestions.push(
				this.buildSuggestion({
					operations: [
						this.buildChangeStaffOperation({
							shiftId: params.conflictShift.id,
							fromStaffId: params.candidateB.id,
							toStaffId: candidateC.id,
						}),
						this.buildChangeStaffOperation({
							shiftId: params.shift.id,
							fromStaffId: params.absentStaffId,
							toStaffId: params.candidateB.id,
						}),
					],
					rationale: this.buildRationale({
						serviceTypeOk: true,
						noConflict: true,
					}),
				}),
			);

			if (params.suggestions.length >= params.maxSuggestions) return;
		}
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
			if (
				!this.canCandidateTakeShift({
					candidate: candidateB,
					shift: params.shift,
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

			this.appendDepth1SuggestionsForCandidateB({
				suggestions,
				shift: params.shift,
				absentStaffId: params.absentStaffId,
				candidateB,
				conflictShift,
				candidates: params.candidates,
				assignableStaffMap: params.assignableStaffMap,
				shiftsByStaff: params.shiftsByStaff,
				maxSuggestions: params.maxSuggestions,
				checkTimeout: params.checkTimeout,
			});
			if (suggestions.length >= params.maxSuggestions) return suggestions;
		}

		return suggestions;
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
}
