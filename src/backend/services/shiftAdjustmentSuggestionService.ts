import { ClientStaffAssignmentRepository } from '@/backend/repositories/clientStaffAssignmentRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import {
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
}

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
	}): ShiftAdjustmentSuggestion[] => {
		const { start: shiftStart, end: shiftEnd } = this.getShiftDateTimes(
			params.shift,
		);
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidate of params.candidates) {
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
	}): ShiftAdjustmentSuggestion[] => {
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidateB of params.candidates) {
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
	}): ShiftAdjustmentSuggestion[] => {
		const depth0Suggestions = this.buildDepth0Suggestions({
			shift: params.shift,
			absentStaffId: params.absentStaffId,
			candidates: params.candidates,
			assignableStaffMap: params.assignableStaffMap,
			shiftsByStaff: params.shiftsByStaff,
			maxSuggestions: params.maxSuggestions,
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
		});
	};

	async suggestShiftAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);
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

		const absentStaff = staffs.find((s) => s.id === validatedAbsence.staffId);
		if (!absentStaff) throw new ServiceError(404, 'Staff not found');

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

		const affected = affectedShifts.map((shift) => {
			const suggestions = this.buildSuggestionsForShift({
				shift,
				absentStaffId: validatedAbsence.staffId,
				candidates,
				assignableStaffMap,
				shiftsByStaff,
				shiftById,
				maxSuggestions: 3,
			});

			return {
				shift: toShiftSnapshot(shift),
				suggestions,
			};
		});

		return {
			absence: validatedAbsence,
			affected,
		};
	}
}
