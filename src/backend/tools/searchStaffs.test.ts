import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import type { ToolExecutionOptions } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createSearchStaffsTool,
	SearchStaffsParametersSchema,
	SearchStaffsResult,
} from './searchStaffs';

describe('searchStaffs tool', () => {
	const mockSearchByNameOrKana = vi.fn();

	const mockSupabase = {} as SupabaseClient<Database>;

	// テスト用のダミー ToolExecutionOptions
	const dummyToolOptions: ToolExecutionOptions = {
		toolCallId: 'test-call-id',
		messages: [],
		abortSignal: new AbortController().signal,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createSearchStaffsTool', () => {
		it('tool が正しい構造を持つ', () => {
			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
			});

			expect(tool).toHaveProperty('description');
			expect(tool).toHaveProperty('inputSchema');
			expect(tool).toHaveProperty('execute');
			expect(typeof tool.execute).toBe('function');
		});

		it('description がスタッフ検索について説明している', () => {
			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
			});

			expect(tool.description).toContain('スタッフ');
			expect(tool.description).toContain('検索');
		});
	});

	describe('SearchStaffsParametersSchema', () => {
		it('正しいパラメータをパースできる', () => {
			const validParams = {
				query: '山田',
			};

			const result = SearchStaffsParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		it('空文字列を拒否する', () => {
			const invalidParams = {
				query: '',
			};

			const result = SearchStaffsParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('100文字以下のクエリを受け付ける', () => {
			const validParams = {
				query: 'あ'.repeat(100),
			};

			const result = SearchStaffsParametersSchema.safeParse(validParams);
			expect(result.success).toBe(true);
		});

		it('100文字を超えるクエリを拒否する', () => {
			const invalidParams = {
				query: 'あ'.repeat(101),
			};

			const result = SearchStaffsParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});

		it('query パラメータが必須', () => {
			const invalidParams = {};

			const result = SearchStaffsParametersSchema.safeParse(invalidParams);
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		// StaffRepository のモック
		const mockStaffRepository = {
			searchByNameOrKana: mockSearchByNameOrKana,
		};

		it('名前が部分一致するスタッフを返す', async () => {
			mockSearchByNameOrKana.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: '山田太郎',
					role: 'admin',
					service_type_ids: ['physical-care', 'life-support'],
				},
				{
					id: TEST_IDS.STAFF_2,
					name: '山田花子',
					role: 'helper',
					service_type_ids: ['life-support'],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: '山田' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(2);
			expect(result.staffs[0].name).toBe('山田太郎');
			expect(result.staffs[1].name).toBe('山田花子');
			expect(mockSearchByNameOrKana).toHaveBeenCalledWith(
				TEST_IDS.OFFICE_1,
				'山田',
				10,
			);
		});

		it('最大10件まで返す（DB側でlimit）', async () => {
			// Repository が最大10件を返すことをシミュレート
			const tenStaffs = Array.from({ length: 10 }, (_, i) => ({
				id: `aaaaaaaa-bbbb-4ccc-8ddd-${i.toString().padStart(12, '0')}`,
				name: `山田${i}号`,
				role: 'helper',
				service_type_ids: [],
			}));

			mockSearchByNameOrKana.mockResolvedValue(tenStaffs);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: '山田' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(10);
			expect(mockSearchByNameOrKana).toHaveBeenCalledWith(
				TEST_IDS.OFFICE_1,
				'山田',
				10,
			);
		});

		it('該当するスタッフがいない場合は空配列を返す', async () => {
			mockSearchByNameOrKana.mockResolvedValue([]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: '山田' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(0);
		});

		it('結果に id, name, role, serviceTypeIds が含まれる', async () => {
			mockSearchByNameOrKana.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: '山田太郎',
					role: 'admin',
					service_type_ids: ['physical-care', 'life-support'],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: '山田' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs[0]).toEqual({
				id: TEST_IDS.STAFF_1,
				name: '山田太郎',
				role: 'admin',
				serviceTypeIds: ['physical-care', 'life-support'],
			});
		});

		it('ケースインセンシティブ検索がDB側で行われる（アルファベット）', async () => {
			mockSearchByNameOrKana.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: 'John Smith',
					role: 'helper',
					service_type_ids: [],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: 'john' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(1);
			expect(mockSearchByNameOrKana).toHaveBeenCalledWith(
				TEST_IDS.OFFICE_1,
				'john',
				10,
			);
		});

		it('ひらがな検索が可能', async () => {
			mockSearchByNameOrKana.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: 'やまだたろう',
					kana: 'やまだたろう',
					role: 'helper',
					service_type_ids: [],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: 'やまだ' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(1);
		});

		it('kanaフィールドでも検索できる', async () => {
			mockSearchByNameOrKana.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: '山田太郎',
					kana: 'やまだたろう',
					role: 'admin',
					service_type_ids: ['physical-care'],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result = (await tool.execute!(
				{ query: 'やまだ' },
				dummyToolOptions,
			)) as SearchStaffsResult;

			expect(result.staffs).toHaveLength(1);
			expect(result.staffs[0].name).toBe('山田太郎');
			expect(mockSearchByNameOrKana).toHaveBeenCalledWith(
				TEST_IDS.OFFICE_1,
				'やまだ',
				10,
			);
		});
	});
});
