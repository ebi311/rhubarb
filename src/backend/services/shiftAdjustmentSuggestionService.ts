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

type OfficeStaff = Awaited<ReturnType<StaffRepository['listByOffice']>>[number];

export class ShiftAdjustmentSuggestionService {
	private staffRepository: StaffRepository;
	private shiftRepository: ShiftRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options: ShiftAdjustmentSuggestionServiceOptions = {},
	) {
		const {
			staffRepository = new StaffRepository(this.supabase),
			shiftRepository = new ShiftRepository(this.supabase),
		} = options;

		this.staffRepository = staffRepository;
		this.shiftRepository = shiftRepository;
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
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

	private validateStaffAbsence = (
		absence: StaffAbsenceInput,
	): StaffAbsenceInput => {
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

	private normalizeMemoKeywords = (memo?: string): string[] => {
		if (!memo) return [];
		return memo
			.split(/[\s、,。]+/)
			.map((word) => word.trim().toLowerCase())
			.filter((word) => word.length >= 2)
			.slice(0, 5);
	};

	private countPastAssignmentsIn90DaysByStaff = async (params: {
		officeId: string;
		clientId: string;
		baseDate: Date;
	}): Promise<Map<string, number>> => {
		const startDate = new Date(params.baseDate);
		startDate.setDate(startDate.getDate() - 90);
		const shifts = await this.shiftRepository.list({
			officeId: params.officeId,
			status: 'scheduled',
			startDate,
			endDate: params.baseDate,
			clientId: params.clientId,
		});

		const countByStaff = new Map<string, number>();
		for (const shift of shifts) {
			if (!shift.staff_id) continue;
			countByStaff.set(
				shift.staff_id,
				(countByStaff.get(shift.staff_id) ?? 0) + 1,
			);
		}

		return countByStaff;
	};

	async suggestStaffAbsenceAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const validatedAbsence = this.validateStaffAbsence(absence);
		const adminStaff = await this.getAdminStaff(userId);
		const officeId = adminStaff.office_id;
		const [absentShifts, staffs] = await Promise.all([
			this.shiftRepository.list({
				officeId,
				staffId: validatedAbsence.staffId,
				status: 'scheduled',
				startDate: validatedAbsence.startDate,
				endDate: validatedAbsence.endDate,
			}),
			this.staffRepository.listByOffice(officeId),
		]);
		const candidates = this.buildCandidates({
			staffs,
			absentStaffId: validatedAbsence.staffId,
		});
		const memoKeywords = this.normalizeMemoKeywords(validatedAbsence.memo);
		const shiftsOnDateCache = new Map<string, Promise<ScheduledShift[]>>();
		const pastAssignmentsCache = new Map<
			string,
			Promise<Map<string, number>>
		>();

		const affected = await Promise.all(
			absentShifts.map(async (shift) => {
				const shiftDate = getJstDateOnly(shift.date);
				const dateKey = shiftDate.toISOString();
				const shiftsOnDatePromise =
					shiftsOnDateCache.get(dateKey) ??
					this.shiftRepository.list({
						officeId,
						status: 'scheduled',
						startDate: shiftDate,
						endDate: shiftDate,
					});
				shiftsOnDateCache.set(dateKey, shiftsOnDatePromise);
				const shiftsOnDate = await shiftsOnDatePromise;
				const shiftsByStaff = this.buildShiftsByStaff(
					shiftsOnDate.filter((s) => s.id !== shift.id),
				);
				const targetRange = this.getShiftDateTimes(shift);

				const pastAssignmentsKey = `${shift.client_id}|${dateKey}`;
				const pastAssignmentsPromise =
					pastAssignmentsCache.get(pastAssignmentsKey) ??
					this.countPastAssignmentsIn90DaysByStaff({
						officeId,
						clientId: shift.client_id,
						baseDate: shiftDate,
					});
				pastAssignmentsCache.set(pastAssignmentsKey, pastAssignmentsPromise);
				const pastAssignmentsByStaff = await pastAssignmentsPromise;

				const scored = candidates
					.filter((candidate) =>
						candidate.service_type_ids.includes(shift.service_type_id),
					)
					.map((candidate) => {
						const available = !this.hasConflictForRange({
							shiftsByStaff,
							staffId: candidate.id,
							range: targetRange,
						});
						const pastAssignments =
							pastAssignmentsByStaff.get(candidate.id) ?? 0;
						const note = candidate.note?.toLowerCase() ?? '';
						const keywordMatched = memoKeywords.some((keyword) =>
							note.includes(keyword),
						);
						return {
							candidate,
							available,
							pastAssignments,
							keywordMatched,
						};
					});

				const suggestions = scored
					.filter((item) => item.available)
					.sort((a, b) => {
						if (a.pastAssignments !== b.pastAssignments) {
							return b.pastAssignments - a.pastAssignments;
						}
						if (a.keywordMatched !== b.keywordMatched) {
							return a.keywordMatched ? -1 : 1;
						}
						return a.candidate.name.localeCompare(b.candidate.name, 'ja');
					})
					.slice(0, 3)
					.map(({ candidate, pastAssignments, keywordMatched }) => {
						const rationale: ShiftAdjustmentRationaleItem[] = [
							{ code: 'available', message: '時間重複なし' },
							{
								code: 'past_assignment_90d',
								message: `過去90日担当回数: ${pastAssignments}`,
							},
							{
								code: keywordMatched
									? 'memo_keyword_match'
									: 'memo_keyword_unmatched',
								message: keywordMatched
									? '備考キーワード一致'
									: '備考キーワード一致なし',
							},
						];
						return this.buildSuggestion({
							operations: [
								this.buildChangeStaffOperation({
									shiftId: shift.id,
									fromStaffId: validatedAbsence.staffId,
									toStaffId: candidate.id,
								}),
							],
							rationale,
						});
					});

				return {
					shift: toShiftSnapshot(shift),
					suggestions,
				};
			}),
		);

		return {
			absence: validatedAbsence,
			affected: affected.filter((item) => item.suggestions.length > 0),
		};
	}
}
