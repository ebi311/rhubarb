import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import {
	ShiftAdjustmentOperationSchema,
	ShiftAdjustmentRequestSchema,
	StaffAbsenceInputSchema,
	StaffAbsenceProcessMetaSchema,
	StaffAbsenceProcessResultSchema,
	SuggestClientDatetimeChangeAdjustmentsOutputSchema,
	SuggestShiftAdjustmentsOutputSchema,
} from './shiftAdjustmentActionSchemas';
import { TimeRangeSchema } from './valueObjects/timeRange';

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
				'開始日は終了日以前に設定してください',
			);
			expect(result.error.issues[0]?.path).toEqual(['startDate']);
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
				'欠勤期間は最大14日間までです',
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

	it('存在しない日付を日本語メッセージで拒否する', () => {
		const result = StaffAbsenceInputSchema.safeParse({
			staffId: TEST_IDS.STAFF_1,
			startDate: '2026-02-31',
			endDate: '2026-03-01',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				'存在する日付を指定してください',
			);
			expect(result.error.issues[0]?.path).toEqual(['startDate']);
		}
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

	it('type=client_datetime_change を受け付ける', () => {
		const result = ShiftAdjustmentRequestSchema.safeParse({
			type: 'client_datetime_change',
			payload: {
				shiftId: TEST_IDS.SCHEDULE_1,
				newDate: '2026-02-03',
				newStartTime: { hour: 9, minute: 0 },
				newEndTime: { hour: 10, minute: 0 },
				memo: '利用者都合',
			},
		});

		expect(result.success).toBe(true);
	});

	it('type=client_datetime_change で newStartTime > newEndTime の場合に TimeRangeSchema のエラーが payload.newEndTime に伝播する', () => {
		const timeRangeParse = TimeRangeSchema.safeParse({
			start: { hour: 10, minute: 0 },
			end: { hour: 9, minute: 0 },
		});
		expect(timeRangeParse.success).toBe(false);

		if (timeRangeParse.success) {
			throw new Error(
				'テストセットアップエラー: TimeRangeSchema がエラーになりませんでした',
			);
		}

		const expectedMessage = timeRangeParse.error.issues.find(
			(issue) => issue.path.join('.') === 'end',
		)?.message;

		const result = ShiftAdjustmentRequestSchema.safeParse({
			type: 'client_datetime_change',
			payload: {
				shiftId: TEST_IDS.SCHEDULE_1,
				newDate: '2026-02-03',
				newStartTime: { hour: 10, minute: 0 },
				newEndTime: { hour: 9, minute: 0 },
			},
		});

		expect(result.success).toBe(false);

		if (result.success) {
			throw new Error(
				'テストセットアップエラー: client_datetime_change がバリデーションエラーになりませんでした',
			);
		}

		const issue = result.error.issues.find(
			(item) => item.path.join('.') === 'payload.newEndTime',
		);

		expect(issue).toBeDefined();
		expect(issue?.message).toBe(expectedMessage);
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

	it('type=update_shift_schedule で new_start_time > new_end_time の場合に TimeRangeSchema のエラーが new_end_time に伝播する', () => {
		const invalidClientDatetimeChange = ShiftAdjustmentRequestSchema.safeParse({
			type: 'client_datetime_change',
			payload: {
				shiftId: TEST_IDS.SCHEDULE_1,
				newDate: '2026-02-03',
				newStartTime: { hour: 10, minute: 0 },
				newEndTime: { hour: 9, minute: 0 },
			},
		});

		expect(invalidClientDatetimeChange.success).toBe(false);

		if (invalidClientDatetimeChange.success) {
			throw new Error(
				'テストセットアップエラー: client_datetime_change がバリデーションエラーになりませんでした',
			);
		}

		const clientEndTimeIssue = invalidClientDatetimeChange.error.issues.find(
			(issue) => issue.path.join('.') === 'payload.newEndTime',
		);

		expect(clientEndTimeIssue).toBeDefined();
		const timeRangeErrorMessage = clientEndTimeIssue?.message;

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
		expect(newEndTimeIssue?.message).toBe(timeRangeErrorMessage);
	});
});

describe('StaffAbsenceProcessMetaSchema', () => {
	it('timedOut=false かつ processedCount===totalCount を受け付ける', () => {
		const result = StaffAbsenceProcessMetaSchema.safeParse({
			timedOut: false,
			processedCount: 2,
			totalCount: 2,
		});

		expect(result.success).toBe(true);
	});

	it('timedOut=false で processedCount と totalCount が不一致なら拒否する', () => {
		const result = StaffAbsenceProcessMetaSchema.safeParse({
			timedOut: false,
			processedCount: 1,
			totalCount: 2,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				'processedCount must equal totalCount when timedOut is false',
			);
			expect(result.error.issues[0]?.path).toEqual(['processedCount']);
		}
	});

	it('timedOut=true の partial result は受け付ける', () => {
		const result = StaffAbsenceProcessMetaSchema.safeParse({
			timedOut: true,
			processedCount: 1,
			totalCount: 2,
		});

		expect(result.success).toBe(true);
	});
});

describe('StaffAbsenceProcessResultSchema', () => {
	it('partial result の shape をパースできる', () => {
		const result = StaffAbsenceProcessResultSchema.safeParse({
			meta: { timedOut: true, processedCount: 1, totalCount: 2 },
			absenceStaffId: TEST_IDS.STAFF_1,
			absenceStaffName: '山田太郎',
			startDate: '2026-02-01',
			endDate: '2026-02-02',
			affectedShifts: [
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
					candidates: [
						{
							staffId: TEST_IDS.STAFF_2,
							staffName: '佐藤花子',
							priority: 'available',
						},
					],
				},
			],
			summary: '影響シフト: 1/2件（一部のみ処理）',
		});

		expect(result.success).toBe(true);
	});

	it('processedCount が totalCount を超える場合は拒否する', () => {
		const result = StaffAbsenceProcessResultSchema.safeParse({
			meta: { timedOut: true, processedCount: 2, totalCount: 1 },
			absenceStaffId: TEST_IDS.STAFF_1,
			absenceStaffName: '山田太郎',
			startDate: '2026-02-01',
			endDate: '2026-02-02',
			affectedShifts: [],
			summary: '影響シフト: 0件',
		});

		expect(result.success).toBe(false);
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
});

describe('SuggestClientDatetimeChangeAdjustmentsOutputSchema', () => {
	it('meta が無くてもパースできる（後方互換）', () => {
		const result = SuggestClientDatetimeChangeAdjustmentsOutputSchema.safeParse(
			{
				change: {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: '2026-02-03',
					newStartTime: { hour: 9, minute: 0 },
					newEndTime: { hour: 10, minute: 0 },
				},
				target: {
					shift: {
						id: TEST_IDS.SCHEDULE_1,
						client_id: TEST_IDS.CLIENT_1,
						service_type_id: 'life-support',
						staff_id: TEST_IDS.STAFF_1,
						date: '2026-02-03',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						status: 'scheduled',
					},
					suggestions: [],
				},
			},
		);

		expect(result.success).toBe(true);
	});

	it('meta.timedOut を受け付ける', () => {
		const result = SuggestClientDatetimeChangeAdjustmentsOutputSchema.safeParse(
			{
				meta: { timedOut: true },
				change: {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: '2026-02-03',
					newStartTime: { hour: 9, minute: 0 },
					newEndTime: { hour: 10, minute: 0 },
				},
				target: {
					shift: {
						id: TEST_IDS.SCHEDULE_1,
						client_id: TEST_IDS.CLIENT_1,
						service_type_id: 'life-support',
						staff_id: TEST_IDS.STAFF_1,
						date: '2026-02-03',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						status: 'scheduled',
					},
					suggestions: [],
				},
			},
		);

		expect(result.success).toBe(true);
	});
});
