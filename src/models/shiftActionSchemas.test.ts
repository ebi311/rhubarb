import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import { CreateOneOffShiftInputSchema } from './shiftActionSchemas';

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
