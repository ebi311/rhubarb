import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createSearchStaffsTool,
	SearchStaffsParametersSchema,
	SearchStaffsResult,
} from './searchStaffs';

describe('searchStaffs tool', () => {
	const mockListByOffice = vi.fn();

	const mockSupabase = {} as SupabaseClient<Database>;

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
			listByOffice: mockListByOffice,
		};

		it('名前が部分一致するスタッフを返す', async () => {
			mockListByOffice.mockResolvedValue([
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
				{
					id: TEST_IDS.STAFF_3,
					name: '鈴木一郎',
					role: 'helper',
					service_type_ids: ['physical-care'],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result: SearchStaffsResult = await tool.execute({ query: '山田' });

			expect(result.staffs).toHaveLength(2);
			expect(result.staffs[0].name).toBe('山田太郎');
			expect(result.staffs[1].name).toBe('山田花子');
		});

		it('最大10件まで返す', async () => {
			// 15件のスタッフを生成
			const manyStaffs = Array.from({ length: 15 }, (_, i) => ({
				id: `aaaaaaaa-bbbb-4ccc-8ddd-${i.toString().padStart(12, '0')}`,
				name: `山田${i}号`,
				role: 'helper',
				service_type_ids: [],
			}));

			mockListByOffice.mockResolvedValue(manyStaffs);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result: SearchStaffsResult = await tool.execute({ query: '山田' });

			expect(result.staffs).toHaveLength(10);
		});

		it('該当するスタッフがいない場合は空配列を返す', async () => {
			mockListByOffice.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: '田中太郎',
					role: 'helper',
					service_type_ids: [],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result: SearchStaffsResult = await tool.execute({ query: '山田' });

			expect(result.staffs).toHaveLength(0);
		});

		it('結果に id, name, role, serviceTypeIds が含まれる', async () => {
			mockListByOffice.mockResolvedValue([
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

			const result: SearchStaffsResult = await tool.execute({ query: '山田' });

			expect(result.staffs[0]).toEqual({
				id: TEST_IDS.STAFF_1,
				name: '山田太郎',
				role: 'admin',
				serviceTypeIds: ['physical-care', 'life-support'],
			});
		});

		it('大文字小文字を区別しない検索が可能（ひらがな）', async () => {
			mockListByOffice.mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: 'やまだたろう',
					role: 'helper',
					service_type_ids: [],
				},
			]);

			const tool = createSearchStaffsTool({
				supabase: mockSupabase,
				officeId: TEST_IDS.OFFICE_1,
				staffRepository: mockStaffRepository,
			});

			const result: SearchStaffsResult = await tool.execute({
				query: 'やまだ',
			});

			expect(result.staffs).toHaveLength(1);
		});
	});
});
