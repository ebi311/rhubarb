import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import { StaffAbsenceInputSchema } from './shiftAdjustmentActionSchemas';

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
});
