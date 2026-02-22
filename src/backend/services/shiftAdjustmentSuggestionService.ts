import { ClientStaffAssignmentRepository } from '@/backend/repositories/clientStaffAssignmentRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import {
	ShiftAdjustmentRationaleItem,
	ShiftAdjustmentOperation,
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

	async suggestShiftAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);

		const parsedAbsence = StaffAbsenceInputSchema.safeParse(absence);
		if (!parsedAbsence.success) {
			throw new ServiceError(400, 'Validation error', parsedAbsence.error.issues);
		}
		const validatedAbsence = parsedAbsence.data;

		const officeId = adminStaff.office_id;

		const todayJst = getJstDateOnly(new Date());
		const todayStart = setJstTime(todayJst, 0, 0);
		const rangeStart = setJstTime(
			getJstDateOnly(validatedAbsence.startDate),
			0,
			0,
		);
		const startDateTime = rangeStart > todayStart ? rangeStart : todayStart;

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

		// Repository 側のフィルタに依存しすぎないよう、当日以降のみを再度保証する
		const filteredScheduledShifts = scheduledShifts.filter((shift) => {
			if (shift.status !== 'scheduled') return false;
			const shiftStart = setJstTime(
				shift.date,
				shift.time.start.hour,
				shift.time.start.minute,
			);
			return shiftStart >= startDateTime;
		});

		const candidates = staffs
			.filter((s) => s.id !== validatedAbsence.staffId)
			.filter((s) => s.role === 'helper')
			// listByOffice は name 昇順の想定だが、念のため安定化
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

		const shiftsByStaff = new Map<
			string,
			{ shiftId: string; start: Date; end: Date }[]
		>();
		for (const shift of filteredScheduledShifts) {
			if (!shift.staff_id) continue;
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

		const affectedShifts = filteredScheduledShifts.filter(
			(s) => s.staff_id === validatedAbsence.staffId,
		);

		const clientIds = Array.from(
			new Set(filteredScheduledShifts.map((s) => s.client_id)),
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

		const shiftById = new Map(filteredScheduledShifts.map((s) => [s.id, s]));

		const affected = affectedShifts.map((shift) => {
			const shiftStart = setJstTime(
				shift.date,
				shift.time.start.hour,
				shift.time.start.minute,
			);
			const shiftEnd = setJstTime(
				shift.date,
				shift.time.end.hour,
				shift.time.end.minute,
			);

			const suggestions: ShiftAdjustmentSuggestion[] = [];

			// 深さ0探索: そのまま差し替え可能な候補
			for (const candidate of candidates) {
				if (!candidate.service_type_ids.includes(shift.service_type_id)) {
					continue;
				}
				const assignable = assignableStaffMap
					.get(
						this.assignmentKey({
							clientId: shift.client_id,
							serviceTypeId: shift.service_type_id,
						}),
					)
					?.has(candidate.id);
				if (!assignable) continue;

				const candidateShifts = shiftsByStaff.get(candidate.id) ?? [];
				const hasConflict = candidateShifts.some((s) =>
					isOverlapping(
						{ start: shiftStart, end: shiftEnd },
						{ start: s.start, end: s.end },
					),
				);
				if (hasConflict) continue;

				suggestions.push(
					this.buildSuggestion({
						operations: [
							this.buildChangeStaffOperation({
								shiftId: shift.id,
								fromStaffId: validatedAbsence.staffId,
								toStaffId: candidate.id,
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

			// 深さ1探索: 深さ0で見つからない場合のみ、1回だけ玉突き
			if (suggestions.length === 0) {
				for (const candidateB of candidates) {
					if (!candidateB.service_type_ids.includes(shift.service_type_id)) {
						continue;
					}
					const assignableB = assignableStaffMap
						.get(
							this.assignmentKey({
								clientId: shift.client_id,
								serviceTypeId: shift.service_type_id,
							}),
						)
						?.has(candidateB.id);
					if (!assignableB) continue;

					const candidateBShifts = shiftsByStaff.get(candidateB.id) ?? [];
					const conflicts = candidateBShifts.filter((s) =>
						isOverlapping(
							{ start: shiftStart, end: shiftEnd },
							{ start: s.start, end: s.end },
						),
					);
					if (conflicts.length === 0) continue;
					if (conflicts.length !== 1) continue;

					const conflictShift = shiftById.get(conflicts[0]!.shiftId);
					if (!conflictShift) continue;
					if (conflictShift.staff_id !== candidateB.id) continue;

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
						if (candidateC.id === validatedAbsence.staffId) continue;
						if (candidateC.id === candidateB.id) continue;
						if (
							!candidateC.service_type_ids.includes(
								conflictShift.service_type_id,
							)
						) {
							continue;
						}

						const assignableC = assignableStaffMap
							.get(
								this.assignmentKey({
									clientId: conflictShift.client_id,
									serviceTypeId: conflictShift.service_type_id,
								}),
							)
							?.has(candidateC.id);
						if (!assignableC) continue;

						const candidateCShifts = shiftsByStaff.get(candidateC.id) ?? [];
						const candidateCHasConflict = candidateCShifts.some((s) =>
							isOverlapping(
								{ start: conflictStart, end: conflictEnd },
								{ start: s.start, end: s.end },
							),
						);
						if (candidateCHasConflict) continue;

						suggestions.push(
							this.buildSuggestion({
								operations: [
									this.buildChangeStaffOperation({
										shiftId: conflictShift.id,
										fromStaffId: candidateB.id,
										toStaffId: candidateC.id,
									}),
									this.buildChangeStaffOperation({
										shiftId: shift.id,
										fromStaffId: validatedAbsence.staffId,
										toStaffId: candidateB.id,
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
					if (suggestions.length >= 3) break;
				}
			}

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
