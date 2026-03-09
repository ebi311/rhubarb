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

		it('clientId（オプション）を受け付ける', () => {
			const paramsWithClientId = {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
			};

			const result =
				SearchAvailableHelpersParametersSchema.safeParse(paramsWithClientId);
			expect(result.success).toBe(true);
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
	});
});
