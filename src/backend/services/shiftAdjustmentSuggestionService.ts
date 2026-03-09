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

	/**
	 * 候補者が特定のシフトに割り当て可能かつ時間重複がないかチェック
	 */
	private isValidCandidate(params: {
		candidateId: string;
		serviceTypeId: ServiceTypeId;
		clientId: string;
		candidateServiceTypeIds: ServiceTypeId[];
		shiftStart: Date;
		shiftEnd: Date;
		shiftsByStaff: Map<string, { shiftId: string; start: Date; end: Date }[]>;
		assignableStaffMap: Map<string, Set<string>>;
	}): boolean {
		if (!params.candidateServiceTypeIds.includes(params.serviceTypeId)) {
			return false;
		}

		const assignable = params.assignableStaffMap
			.get(
				this.assignmentKey({
					clientId: params.clientId,
					serviceTypeId: params.serviceTypeId,
				}),
			)
			?.has(params.candidateId);
		if (!assignable) return false;

		const candidateShifts = params.shiftsByStaff.get(params.candidateId) ?? [];
		const hasConflict = candidateShifts.some((s) =>
			isOverlapping(
				{ start: params.shiftStart, end: params.shiftEnd },
				{ start: s.start, end: s.end },
			),
		);
		return !hasConflict;
	}

	/**
	 * 深さ0探索: 直接代替可能な候補を探す
	 */
	private findDirectReplacements(params: {
		shift: {
			id: string;
			client_id: string;
			service_type_id: ServiceTypeId;
		};
		shiftStart: Date;
		shiftEnd: Date;
		absentStaffId: string;
		candidates: Array<{
			id: string;
			service_type_ids: ServiceTypeId[];
		}>;
		shiftsByStaff: Map<string, { shiftId: string; start: Date; end: Date }[]>;
		assignableStaffMap: Map<string, Set<string>>;
		maxSuggestions: number;
	}): ShiftAdjustmentSuggestion[] {
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidate of params.candidates) {
			const isValid = this.isValidCandidate({
				candidateId: candidate.id,
				serviceTypeId: params.shift.service_type_id,
				clientId: params.shift.client_id,
				candidateServiceTypeIds: candidate.service_type_ids,
				shiftStart: params.shiftStart,
				shiftEnd: params.shiftEnd,
				shiftsByStaff: params.shiftsByStaff,
				assignableStaffMap: params.assignableStaffMap,
			});
			if (!isValid) continue;

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
	}

	/**
	 * 連鎖の2番目の候補（衝突シフトを引き受ける人）を探す
	 */
	private findSecondaryCandidate(params: {
		conflictShift: {
			id: string;
			client_id: string;
			service_type_id: ServiceTypeId;
		};
		conflictStart: Date;
		conflictEnd: Date;
		excludeIds: string[];
		candidates: Array<{
			id: string;
			service_type_ids: ServiceTypeId[];
		}>;
		shiftsByStaff: Map<string, { shiftId: string; start: Date; end: Date }[]>;
		assignableStaffMap: Map<string, Set<string>>;
	}): string | null {
		for (const candidateC of params.candidates) {
			if (params.excludeIds.includes(candidateC.id)) continue;

			const isValid = this.isValidCandidate({
				candidateId: candidateC.id,
				serviceTypeId: params.conflictShift.service_type_id,
				clientId: params.conflictShift.client_id,
				candidateServiceTypeIds: candidateC.service_type_ids,
				shiftStart: params.conflictStart,
				shiftEnd: params.conflictEnd,
				shiftsByStaff: params.shiftsByStaff,
				assignableStaffMap: params.assignableStaffMap,
			});
			if (isValid) return candidateC.id;
		}
		return null;
	}

	/**
	 * 候補者Bが持つシフトの中から、対象時間帯と衝突する唯一のシフトを取得
	 */
	private findSingleConflictShift(params: {
		candidateBId: string;
		shiftStart: Date;
		shiftEnd: Date;
		shiftsByStaff: Map<string, { shiftId: string; start: Date; end: Date }[]>;
		shiftById: Map<
			string,
			{
				id: string;
				client_id: string;
				service_type_id: ServiceTypeId;
				staff_id?: string | null;
				date: Date;
				time: {
					start: { hour: number; minute: number };
					end: { hour: number; minute: number };
				};
			}
		>;
	}): {
		conflictShift: {
			id: string;
			client_id: string;
			service_type_id: ServiceTypeId;
			staff_id?: string | null;
			date: Date;
			time: {
				start: { hour: number; minute: number };
				end: { hour: number; minute: number };
			};
		};
		conflictStart: Date;
		conflictEnd: Date;
	} | null {
		const candidateBShifts =
			params.shiftsByStaff.get(params.candidateBId) ?? [];
		const conflicts = candidateBShifts.filter((s) =>
			isOverlapping(
				{ start: params.shiftStart, end: params.shiftEnd },
				{ start: s.start, end: s.end },
			),
		);
		if (conflicts.length !== 1) return null;

		const conflictShift = params.shiftById.get(conflicts[0]!.shiftId);
		if (!conflictShift || conflictShift.staff_id !== params.candidateBId) {
			return null;
		}

		return {
			conflictShift,
			conflictStart: setJstTime(
				conflictShift.date,
				conflictShift.time.start.hour,
				conflictShift.time.start.minute,
			),
			conflictEnd: setJstTime(
				conflictShift.date,
				conflictShift.time.end.hour,
				conflictShift.time.end.minute,
			),
		};
	}

	/**
	 * 深さ1探索: 連鎖的な代替候補を探す（玉突き）
	 */
	private findChainReplacements(params: {
		shift: {
			id: string;
			client_id: string;
			service_type_id: ServiceTypeId;
		};
		shiftStart: Date;
		shiftEnd: Date;
		absentStaffId: string;
		candidates: Array<{
			id: string;
			service_type_ids: ServiceTypeId[];
		}>;
		shiftsByStaff: Map<string, { shiftId: string; start: Date; end: Date }[]>;
		assignableStaffMap: Map<string, Set<string>>;
		shiftById: Map<
			string,
			{
				id: string;
				client_id: string;
				service_type_id: ServiceTypeId;
				staff_id?: string | null;
				date: Date;
				time: {
					start: { hour: number; minute: number };
					end: { hour: number; minute: number };
				};
			}
		>;
		maxSuggestions: number;
	}): ShiftAdjustmentSuggestion[] {
		const suggestions: ShiftAdjustmentSuggestion[] = [];

		for (const candidateB of params.candidates) {
			if (candidateB.id === params.absentStaffId) continue;
			if (!candidateB.service_type_ids.includes(params.shift.service_type_id)) {
				continue;
			}
			const assignableB = params.assignableStaffMap
				.get(
					this.assignmentKey({
						clientId: params.shift.client_id,
						serviceTypeId: params.shift.service_type_id,
					}),
				)
				?.has(candidateB.id);
			if (!assignableB) continue;

			// candidateB が持つ唯一の衝突シフトを見つける
			const conflict = this.findSingleConflictShift({
				candidateBId: candidateB.id,
				shiftStart: params.shiftStart,
				shiftEnd: params.shiftEnd,
				shiftsByStaff: params.shiftsByStaff,
				shiftById: params.shiftById,
			});
			if (!conflict) continue;

			// 衝突シフトを引き受けられる人（candidateC）を探す
			const candidateCId = this.findSecondaryCandidate({
				conflictShift: conflict.conflictShift,
				conflictStart: conflict.conflictStart,
				conflictEnd: conflict.conflictEnd,
				excludeIds: [params.absentStaffId, candidateB.id],
				candidates: params.candidates,
				shiftsByStaff: params.shiftsByStaff,
				assignableStaffMap: params.assignableStaffMap,
			});

			if (candidateCId) {
				suggestions.push(
					this.buildSuggestion({
						operations: [
							this.buildChangeStaffOperation({
								shiftId: conflict.conflictShift.id,
								fromStaffId: candidateB.id,
								toStaffId: candidateCId,
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
				if (suggestions.length >= params.maxSuggestions) break;
			}
		}

		return suggestions;
	}

	async suggestShiftAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);

		const parsedAbsence = StaffAbsenceInputSchema.safeParse(absence);
		if (!parsedAbsence.success) {
			throw new ServiceError(
				400,
				'Validation error',
				parsedAbsence.error.issues,
			);
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

		const maxSuggestions = 3;

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

			// 深さ0探索: 直接代替可能な候補
			const directSuggestions = this.findDirectReplacements({
				shift,
				shiftStart,
				shiftEnd,
				absentStaffId: validatedAbsence.staffId,
				candidates,
				shiftsByStaff,
				assignableStaffMap,
				maxSuggestions,
			});

			// 深さ1探索: 深さ0で見つからない場合のみ、連鎖的な代替候補（玉突き）
			const chainSuggestions =
				directSuggestions.length === 0
					? this.findChainReplacements({
							shift,
							shiftStart,
							shiftEnd,
							absentStaffId: validatedAbsence.staffId,
							candidates,
							shiftsByStaff,
							assignableStaffMap,
							shiftById,
							maxSuggestions,
						})
					: [];

			return {
				shift: toShiftSnapshot(shift),
				suggestions: [...directSuggestions, ...chainSuggestions],
			};
		});

		return {
			absence: validatedAbsence,
			affected,
		};
	}
}
