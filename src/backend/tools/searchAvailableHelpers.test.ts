import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
	createSearchAvailableHelpersTool,
	SearchAvailableHelpersParametersSchema,
} from './searchAvailableHelpers';

describe('searchAvailableHelpers tool', () => {
	const mockSupabase = {} as SupabaseClient<Database>;

	it('tool が正しい構造を持つ', () => {
		const tool = createSearchAvailableHelpersTool({
			supabase: mockSupabase,
			officeId: TEST_IDS.OFFICE_1,
		});

		expect(tool).toHaveProperty('description');
		expect(tool).toHaveProperty('inputSchema');
		expect(tool).toHaveProperty('execute');
		expect(typeof tool.execute).toBe('function');
	});

	it('description が日本語で空きヘルパー検索について説明している', () => {
		const tool = createSearchAvailableHelpersTool({
			supabase: mockSupabase,
			officeId: TEST_IDS.OFFICE_1,
		});

		expect(tool.description).toContain('空き');
		expect(tool.description).toContain('ヘルパー');
	});

	describe('SearchAvailableHelpersParametersSchema', () => {
		it('正しいパラメータをパースできる', () => {
			const validParams = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		it('不正な日付形式を拒否する', () => {
			const invalidParams = {
				date: '2026/02/25', // 不正な形式
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('存在しない日付を拒否する（2月31日）', () => {
			const invalidParams = {
				date: '2026-02-31', // 存在しない日付
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain('存在する日付');
			}
		});

		it('存在しない日付を拒否する（4月31日）', () => {
			const invalidParams = {
				date: '2026-04-31', // 存在しない日付
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('閏年の2月29日は有効', () => {
			const validParams = {
				date: '2024-02-29', // 閏年
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		it('閏年でない年の2月29日は無効', () => {
			const invalidParams = {
				date: '2025-02-29', // 閏年ではない
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('clientId と serviceTypeId を一緒に受け付ける', () => {
			const paramsWithClientId = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(paramsWithClientId);
			expect(result.success).toBe(true);
		});

		it('clientId を指定して serviceTypeId を省略すると拒否する', () => {
			const invalidParams = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				// serviceTypeId が未指定
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain('serviceTypeId');
			}
		});

		it('不正な時刻を拒否する', () => {
			const invalidParams = {
				date: '2026-02-25',
				startTime: { hour: 25, minute: 0 }, // 不正な時刻
				endTime: { hour: 11, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('不正な clientId（UUID 形式でない）を拒否する', () => {
			const invalidParams = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: 'not-a-uuid',
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('startTime が endTime より後の場合を拒否する', () => {
			const invalidParams = {
				date: '2026-02-25',
				startTime: { hour: 11, minute: 0 },
				endTime: { hour: 10, minute: 0 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain(
					'開始時刻は終了時刻より前',
				);
			}
		});

		it('startTime と endTime が同じ場合を拒否する', () => {
			const invalidParams = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 30 },
				endTime: { hour: 10, minute: 30 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain(
					'開始時刻は終了時刻より前',
				);
			}
		});

		it('分が異なるケースで startTime < endTime が正しく判定される', () => {
			const validParams = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 10, minute: 30 },
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});
	});
});
