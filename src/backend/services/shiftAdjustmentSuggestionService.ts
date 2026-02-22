import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import type {
	ShiftAdjustmentRationaleItem,
	ShiftAdjustmentSuggestion,
	ShiftSnapshot,
	StaffAbsenceInput,
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

export class ShiftAdjustmentSuggestionService {
	private staffRepository: StaffRepository;
	private shiftRepository: ShiftRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options?: ShiftAdjustmentSuggestionServiceOptions,
	) {
		this.staffRepository =
			options?.staffRepository ?? new StaffRepository(this.supabase);
		this.shiftRepository =
			options?.shiftRepository ?? new ShiftRepository(this.supabase);
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
		shiftId: string;
		fromStaffId: string;
		toStaffId: string;
		rationale: ShiftAdjustmentRationaleItem[];
	}): ShiftAdjustmentSuggestion {
		return {
			operations: [
				{
					type: 'change_staff',
					shift_id: params.shiftId,
					from_staff_id: params.fromStaffId,
					to_staff_id: params.toStaffId,
				},
			],
			rationale: params.rationale,
		};
	}

	async suggestShiftAdjustments(
		userId: string,
		absence: StaffAbsenceInput,
	): Promise<SuggestShiftAdjustmentsOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const officeId = adminStaff.office_id;

		const todayJst = getJstDateOnly(new Date());
		const todayStart = setJstTime(todayJst, 0, 0);
		const rangeStart = setJstTime(getJstDateOnly(absence.startDate), 0, 0);
		const startDateTime = rangeStart > todayStart ? rangeStart : todayStart;

		const [staffs, scheduledShifts] = await Promise.all([
			this.staffRepository.listByOffice(officeId),
			this.shiftRepository.list({
				officeId,
				startDate: absence.startDate,
				endDate: absence.endDate,
				status: 'scheduled',
				startDateTime,
			}),
		]);

		const absentStaff = staffs.find((s) => s.id === absence.staffId);
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
			.filter((s) => s.id !== absence.staffId)
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
			(s) => s.staff_id === absence.staffId,
		);

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
			for (const candidate of candidates) {
				if (!candidate.service_type_ids.includes(shift.service_type_id)) {
					continue;
				}
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
						shiftId: shift.id,
						fromStaffId: absence.staffId,
						toStaffId: candidate.id,
						rationale: this.buildRationale({
							serviceTypeOk: true,
							noConflict: true,
						}),
					}),
				);
				if (suggestions.length >= 3) break;
			}

			return {
				shift: toShiftSnapshot(shift),
				suggestions,
			};
		});

		return {
			absence,
			affected,
		};
	}
}
