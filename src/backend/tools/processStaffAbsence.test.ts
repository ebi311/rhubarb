import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
	createProcessStaffAbsenceTool,
	ProcessStaffAbsenceParametersSchema,
} from './processStaffAbsence';

// ShiftAdjustmentSuggestionService をモック（クラスモックには function を使用）
vi.mock('@/backend/services/shiftAdjustmentSuggestionService', () => ({
	ShiftAdjustmentSuggestionService: function MockService() {
		return {
			processStaffAbsence: vi.fn().mockResolvedValue({
				absenceStaffId: TEST_IDS.STAFF_1,
				absenceStaffName: '山田太郎',
				startDate: '2026-02-25',
				endDate: '2026-02-27',
				affectedShifts: [],
				summary: '影響シフト: 0件',
			}),
		};
	},
}));

describe('processStaffAbsence tool', () => {
	const mockSupabase = {} as SupabaseClient<Database>;

	it('tool が正しい構造を持つ', () => {
		const tool = createProcessStaffAbsenceTool({
			supabase: mockSupabase,
			userId: TEST_IDS.USER_1,
		});

		expect(tool).toHaveProperty('description');
		expect(tool).toHaveProperty('inputSchema');
		expect(tool).toHaveProperty('execute');
		expect(typeof tool.execute).toBe('function');
	});

	it('description が日本語でスタッフ欠勤処理について説明している', () => {
		const tool = createProcessStaffAbsenceTool({
			supabase: mockSupabase,
			userId: TEST_IDS.USER_1,
		});

		expect(tool.description).toContain('欠勤');
		expect(tool.description).toContain('シフト');
	});

	describe('ProcessStaffAbsenceParametersSchema', () => {
		it('正しいパラメータをパースできる', () => {
			const validParams = {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-25',
				endDate: '2026-02-27',
			};

			const result = ProcessStaffAbsenceParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		it('memo を含むパラメータをパースできる', () => {
			const validParams = {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-25',
				endDate: '2026-02-27',
				memo: 'インフルエンザのため休み',
			};

			const result = ProcessStaffAbsenceParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.memo).toBe('インフルエンザのため休み');
			}
		});

		it('不正な日付形式を拒否する', () => {
			const invalidParams = {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026/02/25', // 不正な形式
				endDate: '2026-02-27',
			};

			const result =
				ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('不正な staffId（UUID 形式でない）を拒否する', () => {
			const invalidParams = {
				staffId: 'not-a-uuid',
				startDate: '2026-02-25',
				endDate: '2026-02-27',
			};

			const result =
				ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('memo が500文字を超える場合を拒否する', () => {
			const invalidParams = {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-25',
				endDate: '2026-02-27',
				memo: 'あ'.repeat(501),
			};

			const result =
				ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('memo が500文字ちょうどは許可する', () => {
			const validParams = {
				staffId: TEST_IDS.STAFF_1,
				startDate: '2026-02-25',
				endDate: '2026-02-27',
				memo: 'あ'.repeat(500),
			};

			const result = ProcessStaffAbsenceParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		describe('日付実在性チェック', () => {
			it('2月31日（存在しない日付）を拒否する', () => {
				const invalidParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-02-31',
					endDate: '2026-03-05',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
				expect(result.success).toBe(false);
			});

			it('4月31日（存在しない日付）を拒否する', () => {
				const invalidParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-04-01',
					endDate: '2026-04-31',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
				expect(result.success).toBe(false);
			});

			it('閏年の2月29日を受け入れる', () => {
				const validParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2024-02-29',
					endDate: '2024-02-29',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(validParams);
				expect(result.success).toBe(true);
			});

			it('非閏年の2月29日を拒否する', () => {
				const invalidParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2025-02-29',
					endDate: '2025-03-05',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
				expect(result.success).toBe(false);
			});
		});

		describe('期間チェック', () => {
			it('startDate > endDate の場合を拒否する', () => {
				const invalidParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-03-10',
					endDate: '2026-03-01',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
				expect(result.success).toBe(false);
				if (!result.success) {
					const messages = result.error.issues.map((e) => e.message);
					expect(messages).toContain('開始日は終了日以前に設定してください');
				}
			});

			it('14日を超える期間を拒否する', () => {
				const invalidParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-03-01',
					endDate: '2026-03-16', // 16日間 = 14日超過
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(invalidParams);
				expect(result.success).toBe(false);
				if (!result.success) {
					const messages = result.error.issues.map((e) => e.message);
					expect(messages).toContain('欠勤期間は最大14日間までです');
				}
			});

			it('14日間ちょうどは許可する', () => {
				const validParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-03-01',
					endDate: '2026-03-14', // 14日間
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(validParams);
				expect(result.success).toBe(true);
			});

			it('同日（1日間）は許可する', () => {
				const validParams = {
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-03-01',
					endDate: '2026-03-01',
				};

				const result =
					ProcessStaffAbsenceParametersSchema.safeParse(validParams);
				expect(result.success).toBe(true);
			});
		});
	});

	describe('execute', () => {
		it('execute が ShiftAdjustmentSuggestionService.processStaffAbsence を呼び出す', async () => {
			const tool = createProcessStaffAbsenceTool({
				supabase: mockSupabase,
				userId: TEST_IDS.USER_1,
			});

			// AI SDK v6 の tool.execute は options 引数が必須
			const result = await tool.execute!(
				{
					staffId: TEST_IDS.STAFF_1,
					startDate: '2026-02-25',
					endDate: '2026-02-27',
				},
				{
					abortSignal: new AbortController().signal,
					toolCallId: 'test-call-id',
					messages: [],
				},
			);

			expect(result).toEqual({
				absenceStaffId: TEST_IDS.STAFF_1,
				absenceStaffName: '山田太郎',
				startDate: '2026-02-25',
				endDate: '2026-02-27',
				affectedShifts: [],
				summary: '影響シフト: 0件',
			});
		});
	});
});
