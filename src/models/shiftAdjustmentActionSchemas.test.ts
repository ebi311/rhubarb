import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import {
	ShiftAdjustmentOperationSchema,
	ShiftAdjustmentRequestSchema,
	StaffAbsenceInputSchema,
	SuggestShiftAdjustmentsOutputSchema,
} from './shiftAdjustmentActionSchemas';

describe('StaffAbsenceInputSchema', () => {
	it('start=1日目, end=14日目 は OK（最大14日）', () => {
		const result = StaffAbsenceInputSchema.safeParse({
			staffId: TEST_IDS.STAFF_1,
			startDate: '2026-02-01',
			endDate: '2026-02-14',
			memo: '急休',
		});

		expect(result.success).toBe(true);
	});

	it('startDate > endDate は NG', () => {
		const result = StaffAbsenceInputSchema.safeParse({
			staffId: TEST_IDS.STAFF_1,
			startDate: '2026-02-10',
			endDate: '2026-02-01',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				'startDate must be before or equal to endDate',
			);
			expect(result.error.issues[0]?.path).toEqual(['endDate']);
		}
	});

	it('start=1日目, end=15日目 は NG（15日は超過）', () => {
		const result = StaffAbsenceInputSchema.safeParse({
			staffId: TEST_IDS.STAFF_1,
			startDate: '2026-02-01',
			endDate: '2026-02-15',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				'Date range must be within 14 days',
			);
			expect(result.error.issues[0]?.path).toEqual(['endDate']);
		}
	});

	it('startDate === endDate は OK（回帰）', () => {
		const result = StaffAbsenceInputSchema.safeParse({
			staffId: TEST_IDS.STAFF_1,
			startDate: '2026-02-01',
			endDate: '2026-02-01',
		});

		expect(result.success).toBe(true);
	});
});

describe('ShiftAdjustmentRequestSchema', () => {
	it('type=staff_absence を受け付ける', () => {
		const result = ShiftAdjustmentRequestSchema.safeParse({
			type: 'staff_absence',
			payload: {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-01',
				endDate: '2026-02-01',
			},
		});

		expect(result.success).toBe(true);
	});

	it('未定義の type を受け付けない', () => {
		const result = ShiftAdjustmentRequestSchema.safeParse({
			type: 'unsupported_type',
			payload: {
				shiftId: TEST_IDS.SCHEDULE_1,
				newDate: '2026-02-03',
				newStartTime: { hour: 9, minute: 0 },
				newEndTime: { hour: 10, minute: 0 },
			},
		});

		expect(result.success).toBe(false);
	});
});

describe('ShiftAdjustmentOperationSchema', () => {
	it('type=change_staff を受け付ける', () => {
		const result = ShiftAdjustmentOperationSchema.safeParse({
			type: 'change_staff',
			shift_id: TEST_IDS.SCHEDULE_1,
			from_staff_id: TEST_IDS.STAFF_1,
			to_staff_id: TEST_IDS.STAFF_2,
		});

		expect(result.success).toBe(true);
	});

	it('type=update_shift_schedule を受け付ける', () => {
		const result = ShiftAdjustmentOperationSchema.safeParse({
			type: 'update_shift_schedule',
			shift_id: TEST_IDS.SCHEDULE_1,
			new_date: '2026-02-03',
			new_start_time: { hour: 9, minute: 0 },
			new_end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(true);
	});

	it('type=update_shift_schedule で new_start_time > new_end_time は NG', () => {
		const invalidUpdateShiftSchedule = ShiftAdjustmentOperationSchema.safeParse(
			{
				type: 'update_shift_schedule',
				shift_id: TEST_IDS.SCHEDULE_1,
				new_date: '2026-02-03',
				new_start_time: { hour: 10, minute: 0 },
				new_end_time: { hour: 9, minute: 0 },
			},
		);

		expect(invalidUpdateShiftSchedule.success).toBe(false);

		if (invalidUpdateShiftSchedule.success) {
			throw new Error(
				'テストセットアップエラー: update_shift_schedule がバリデーションエラーになりませんでした',
			);
		}

		const newEndTimeIssue = invalidUpdateShiftSchedule.error.issues.find(
			(issue) => issue.path.join('.') === 'new_end_time',
		);

		expect(newEndTimeIssue).toBeDefined();
		expect(newEndTimeIssue?.code).toBe('custom');
		expect(newEndTimeIssue?.path).toEqual(['new_end_time']);
	});
});

describe('SuggestShiftAdjustmentsOutputSchema', () => {
	it('meta が無くてもパースできる（後方互換）', () => {
		const result = SuggestShiftAdjustmentsOutputSchema.safeParse({
			absence: {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-01',
				endDate: '2026-02-01',
			},
			affected: [],
		});

		expect(result.success).toBe(true);
	});

	it('meta.timedOut を受け付ける', () => {
		const result = SuggestShiftAdjustmentsOutputSchema.safeParse({
			meta: { timedOut: true },
			absence: {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-01',
				endDate: '2026-02-01',
			},
			affected: [],
		});

		expect(result.success).toBe(true);
	});

	it('suggestions が 0 件は NG（1〜3案）', () => {
		const result = SuggestShiftAdjustmentsOutputSchema.safeParse({
			absence: {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-01',
				endDate: '2026-02-01',
			},
			affected: [
				{
					shift: {
						id: TEST_IDS.SCHEDULE_1,
						client_id: TEST_IDS.CLIENT_1,
						service_type_id: 'life-support',
						staff_id: TEST_IDS.STAFF_1,
						date: '2026-02-01',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						status: 'scheduled',
					},
					suggestions: [],
				},
			],
		});

		expect(result.success).toBe(false);
	});
});
