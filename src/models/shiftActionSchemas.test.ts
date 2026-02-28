import { createTestId, TEST_IDS } from '@/test/helpers/testIds';
import { formatJstDateString, toJstTimeStr } from '@/utils/date';
import { describe, expect, it } from 'vitest';
import {
	ConflictingShiftSchema,
	CreateOneOffShiftInputSchema,
	SuggestCandidateStaffForShiftWithNewDatetimeInputSchema,
	UpdateDatetimeAndAssignWithCascadeInputSchema,
	UpdateShiftScheduleInputSchema,
} from './shiftActionSchemas';

describe('CreateOneOffShiftInputSchema', () => {
	it('有効な入力をパースできる', () => {
		const result = CreateOneOffShiftInputSchema.safeParse({
			weekStartDate: '2026-02-16',
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'physical-care',
			staff_id: TEST_IDS.STAFF_1,
			date: '2026-02-19',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.date).toBeInstanceOf(Date);
	});

	it('表示中の週の範囲外の日付はバリデーションエラー', () => {
		const result = CreateOneOffShiftInputSchema.safeParse({
			weekStartDate: '2026-02-16',
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'physical-care',
			date: '2026-02-23',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.some((i) => i.path[0] === 'date')).toBe(true);
	});

	it('表示中の週の日曜（weekStart+6）は有効', () => {
		const result = CreateOneOffShiftInputSchema.safeParse({
			weekStartDate: '2026-02-16',
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'physical-care',
			date: '2026-02-22',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(true);
	});

	it('開始時刻が終了時刻以降の場合はバリデーションエラー', () => {
		const result = CreateOneOffShiftInputSchema.safeParse({
			weekStartDate: '2026-02-16',
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'physical-care',
			date: '2026-02-19',
			start_time: { hour: 10, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.some((i) => i.path[0] === 'end_time')).toBe(
			true,
		);
	});
	it('weekStartDate が月曜でない場合はバリデーションエラー', () => {
		const result = CreateOneOffShiftInputSchema.safeParse({
			weekStartDate: '2026-02-17',
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'physical-care',
			date: '2026-02-19',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.some((i) => i.path[0] === 'weekStartDate')).toBe(
			true,
		);
	});
});

describe('UpdateShiftScheduleInputSchema', () => {
	it('有効な入力をパースでき、dateStr+start/end が Date に transform される', () => {
		const shiftId = createTestId();
		const result = UpdateShiftScheduleInputSchema.safeParse({
			shiftId,
			staffId: TEST_IDS.STAFF_1,
			dateStr: '2026-02-19',
			startTimeStr: '09:00',
			endTimeStr: '10:30',
			reason: '調整',
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.shiftId).toBe(shiftId);
		expect(result.data.staffId).toBe(TEST_IDS.STAFF_1);
		expect(result.data.newStartTime).toBeInstanceOf(Date);
		expect(result.data.newEndTime).toBeInstanceOf(Date);
		expect(formatJstDateString(result.data.newStartTime)).toBe('2026-02-19');
		expect(toJstTimeStr(result.data.newStartTime)).toBe('09:00');
		expect(formatJstDateString(result.data.newEndTime)).toBe('2026-02-19');
		expect(toJstTimeStr(result.data.newEndTime)).toBe('10:30');
		expect(result.data.reason).toBe('調整');
	});

	it('開始時刻が終了時刻以降の場合はバリデーションエラー', () => {
		const result = UpdateShiftScheduleInputSchema.safeParse({
			shiftId: createTestId(),
			dateStr: '2026-02-19',
			startTimeStr: '10:00',
			endTimeStr: '10:00',
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.some((i) => i.path[0] === 'endTimeStr')).toBe(
			true,
		);
	});

	it('dateStr が不正な場合はバリデーションエラー', () => {
		const invalidDate = UpdateShiftScheduleInputSchema.safeParse({
			shiftId: createTestId(),
			dateStr: '2026-02-30',
			startTimeStr: '09:00',
			endTimeStr: '10:00',
		});
		expect(invalidDate.success).toBe(false);
		if (invalidDate.success) return;
		expect(invalidDate.error.issues.some((i) => i.path[0] === 'dateStr')).toBe(
			true,
		);
	});

	it('timeStr が不正な場合はバリデーションエラー', () => {
		const invalidFormat = UpdateShiftScheduleInputSchema.safeParse({
			shiftId: createTestId(),
			dateStr: '2026-02-19',
			startTimeStr: '9:00',
			endTimeStr: '10:00',
		});
		expect(invalidFormat.success).toBe(false);
		if (invalidFormat.success) return;
		expect(
			invalidFormat.error.issues.some((i) => i.path[0] === 'startTimeStr'),
		).toBe(true);

		const invalidRange = UpdateShiftScheduleInputSchema.safeParse({
			shiftId: createTestId(),
			dateStr: '2026-02-19',
			startTimeStr: '09:00',
			endTimeStr: '24:00',
		});
		expect(invalidRange.success).toBe(false);
		if (invalidRange.success) return;
		expect(
			invalidRange.error.issues.some((i) => i.path[0] === 'endTimeStr'),
		).toBe(true);
	});

	it('staffId: undefined / null / uuid の扱い', () => {
		const base = {
			shiftId: createTestId(),
			dateStr: '2026-02-19',
			startTimeStr: '09:00',
			endTimeStr: '10:00',
		} as const;

		const omitted = UpdateShiftScheduleInputSchema.safeParse(base);
		expect(omitted.success).toBe(true);
		if (!omitted.success) return;
		expect(omitted.data.staffId).toBeUndefined();

		const explicitUndefined = UpdateShiftScheduleInputSchema.safeParse({
			...base,
			staffId: undefined,
		});
		expect(explicitUndefined.success).toBe(true);
		if (!explicitUndefined.success) return;
		expect(explicitUndefined.data.staffId).toBeUndefined();

		const nullStaff = UpdateShiftScheduleInputSchema.safeParse({
			...base,
			staffId: null,
		});
		expect(nullStaff.success).toBe(true);
		if (!nullStaff.success) return;
		expect(nullStaff.data.staffId).toBeNull();

		const uuidStaff = UpdateShiftScheduleInputSchema.safeParse({
			...base,
			staffId: TEST_IDS.STAFF_2,
		});
		expect(uuidStaff.success).toBe(true);
		if (!uuidStaff.success) return;
		expect(uuidStaff.data.staffId).toBe(TEST_IDS.STAFF_2);

		const invalidStaff = UpdateShiftScheduleInputSchema.safeParse({
			...base,
			staffId: 'not-a-uuid',
		});
		expect(invalidStaff.success).toBe(false);
		if (invalidStaff.success) return;
		expect(invalidStaff.error.issues.some((i) => i.path[0] === 'staffId')).toBe(
			true,
		);
	});
});

describe('ConflictingShiftSchema', () => {
	it('date は YYYY-MM-DD 形式のみ許可する', () => {
		const base = {
			shiftId: TEST_IDS.SCHEDULE_1,
			clientName: 'テスト利用者',
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
		} as const;

		const valid = ConflictingShiftSchema.safeParse({
			...base,
			date: '2026-02-19',
		});
		expect(valid.success).toBe(true);

		const invalidFormat = ConflictingShiftSchema.safeParse({
			...base,
			date: '2026/02/19',
		});
		expect(invalidFormat.success).toBe(false);

		const invalidDate = ConflictingShiftSchema.safeParse({
			...base,
			date: '2026-02-30',
		});
		expect(invalidDate.success).toBe(false);
	});
});

describe('new datetime refine messages', () => {
	it('候補スタッフ提案の日時入力で終了時刻が開始時刻以前なら日本語メッセージを返す', () => {
		const result =
			SuggestCandidateStaffForShiftWithNewDatetimeInputSchema.safeParse({
				shiftId: createTestId(),
				newStartTime: '2026-02-19T10:00:00+09:00',
				newEndTime: '2026-02-19T10:00:00+09:00',
			});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues[0]?.message).toBe(
			'newEndTime は newStartTime より後の時刻を指定してください',
		);
	});

	it('日時変更+担当者変更入力で終了時刻が開始時刻以前なら日本語メッセージを返す', () => {
		const result = UpdateDatetimeAndAssignWithCascadeInputSchema.safeParse({
			shiftId: createTestId(),
			newStaffId: TEST_IDS.STAFF_1,
			newStartTime: '2026-02-19T10:00:00+09:00',
			newEndTime: '2026-02-19T10:00:00+09:00',
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues[0]?.message).toBe(
			'newEndTime は newStartTime より後の時刻を指定してください',
		);
	});
});
