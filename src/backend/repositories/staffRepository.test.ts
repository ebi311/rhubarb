import type { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	StaffRepository,
	compactQuery,
	normalizeSearchQuery,
} from './staffRepository';

describe('StaffRepository', () => {
	let supabase: SupabaseClient<Database>;
	let repository: StaffRepository;
	const officeId = TEST_IDS.OFFICE_1;
	const serviceTypeIds = {
		one: 'physical-care',
		two: 'life-support',
		three: 'commute-support',
	};
	const baseStaffRow = {
		id: TEST_IDS.STAFF_1,
		office_id: officeId,
		name: '管理者A',
		kana: null as string | null,
		role: 'admin' as const,
		email: 'admin@example.com',
		note: null as string | null,
		auth_user_id: null as string | null,
		created_at: '2025-12-22T00:00:00Z',
		updated_at: '2025-12-22T00:00:00Z',
	};

	beforeEach(() => {
		supabase = {
			from: vi.fn(),
		} as unknown as SupabaseClient<Database>;
		repository = new StaffRepository(supabase);
		vi.clearAllMocks();
	});

	describe('listByOffice', () => {
		it('スタッフとサービス区分IDをまとめて取得できる', async () => {
			const staffRows = [
				baseStaffRow,
				{
					...baseStaffRow,
					id: TEST_IDS.STAFF_2,
					name: 'ヘルパーB',
					role: 'helper' as const,
					email: 'helper@example.com',
				},
			];
			const abilityRows = [
				{ staff_id: staffRows[0].id, service_type_id: serviceTypeIds.one },
				{ staff_id: staffRows[0].id, service_type_id: serviceTypeIds.two },
				{ staff_id: staffRows[1].id, service_type_id: serviceTypeIds.three },
			];

			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockStaffOrder = vi
				.fn()
				.mockResolvedValue({ data: staffRows, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: abilityRows, error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return {
						select: mockStaffSelect,
					};
				}
				if (table === 'staff_service_type_abilities') {
					return {
						select: mockAbilitySelect,
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ order: mockStaffOrder });

			mockAbilitySelect.mockReturnValue({ in: mockAbilityIn });

			const result = await repository.listByOffice(officeId);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('管理者A');
			expect(result[0].service_type_ids).toEqual([
				serviceTypeIds.one,
				serviceTypeIds.two,
			]);
			expect(result[1].service_type_ids).toEqual([serviceTypeIds.three]);
			expect(mockAbilityIn).toHaveBeenCalledWith(
				'staff_id',
				staffRows.map((row) => row.id),
			);
		});
	});

	describe('findWithServiceTypesById', () => {
		it('指定したスタッフをサービス区分付きで返す', async () => {
			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockMaybeSingle = vi
				.fn()
				.mockResolvedValue({ data: baseStaffRow, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi.fn().mockResolvedValue({
				data: [
					{ staff_id: baseStaffRow.id, service_type_id: serviceTypeIds.one },
				],
				error: null,
			});

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { select: mockStaffSelect };
				}
				if (table === 'staff_service_type_abilities') {
					return { select: mockAbilitySelect };
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

			mockAbilitySelect.mockReturnValue({ in: mockAbilityIn });

			const result = await repository.findWithServiceTypesById(baseStaffRow.id);

			expect(result).not.toBeNull();
			expect(result?.service_type_ids).toEqual([serviceTypeIds.one]);
		});

		it('見つからない場合はnullを返す', async () => {
			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockMaybeSingle = vi
				.fn()
				.mockResolvedValue({ data: null, error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { select: mockStaffSelect };
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

			const result = await repository.findWithServiceTypesById(baseStaffRow.id);

			expect(result).toBeNull();
		});
	});

	describe('create', () => {
		it('スタッフを作成しサービス区分を設定できる', async () => {
			const insertRow = {
				...baseStaffRow,
				id: TEST_IDS.STAFF_4,
				kana: 'しんきすたっふ',
				note: 'メモ',
			};
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: insertRow, error: null });

			const mockAbilityDelete = vi.fn().mockReturnThis();
			const mockAbilityEq = vi.fn().mockResolvedValue({ error: null });
			const mockAbilityInsert = vi.fn().mockResolvedValue({ error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { insert: mockInsert };
				}
				if (table === 'staff_service_type_abilities') {
					return {
						delete: mockAbilityDelete,
						insert: mockAbilityInsert,
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockInsert.mockReturnValue({ select: mockSelect });
			mockSelect.mockReturnValue({ single: mockSingle });
			mockAbilityDelete.mockReturnValue({ eq: mockAbilityEq });

			const input = {
				office_id: officeId,
				name: '新規スタッフ',
				kana: 'しんきすたっふ',
				role: 'helper' as const,
				email: 'new@example.com',
				note: 'メモ',
				service_type_ids: [serviceTypeIds.one, serviceTypeIds.two],
			};

			const result = await repository.create(input);

			expect(mockInsert).toHaveBeenCalledWith({
				office_id: input.office_id,
				name: input.name,
				kana: input.kana,
				role: input.role,
				email: input.email,
				note: input.note,
			});
			expect(mockAbilityDelete).toHaveBeenCalled();
			expect(mockAbilityEq).toHaveBeenCalledWith('staff_id', insertRow.id);
			expect(mockAbilityInsert).toHaveBeenCalledWith([
				{ staff_id: insertRow.id, service_type_id: serviceTypeIds.one },
				{ staff_id: insertRow.id, service_type_id: serviceTypeIds.two },
			]);
			expect(result.note).toBe('メモ');
			expect(result.service_type_ids).toEqual([
				serviceTypeIds.one,
				serviceTypeIds.two,
			]);
		});

		it('kanaがnullの場合はnullとして保存される', async () => {
			const insertRow = {
				...baseStaffRow,
				id: TEST_IDS.STAFF_4,
				kana: null,
			};
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: insertRow, error: null });

			const mockAbilityDelete = vi.fn().mockReturnThis();
			const mockAbilityEq = vi.fn().mockResolvedValue({ error: null });
			const mockAbilityInsert = vi.fn().mockResolvedValue({ error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { insert: mockInsert };
				}
				if (table === 'staff_service_type_abilities') {
					return {
						delete: mockAbilityDelete,
						insert: mockAbilityInsert,
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockInsert.mockReturnValue({ select: mockSelect });
			mockSelect.mockReturnValue({ single: mockSingle });
			mockAbilityDelete.mockReturnValue({ eq: mockAbilityEq });

			const input = {
				office_id: officeId,
				name: '新規スタッフ',
				kana: null,
				role: 'helper' as const,
				email: null,
				note: null,
				service_type_ids: [],
			};

			await repository.create(input);

			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({ kana: null }),
			);
		});
	});

	describe('update', () => {
		it('スタッフ情報とサービス区分を更新できる', async () => {
			const updatedRow = {
				...baseStaffRow,
				name: '更新後スタッフ',
				kana: 'こうしんごすたっふ',
				email: 'updated@example.com',
				note: '更新されたメモ',
			};

			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: updatedRow, error: null });

			const mockAbilityDelete = vi.fn().mockReturnThis();
			const mockAbilityEq = vi.fn().mockResolvedValue({ error: null });
			const mockAbilityInsert = vi.fn().mockResolvedValue({ error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { update: mockUpdate };
				}
				if (table === 'staff_service_type_abilities') {
					return {
						delete: mockAbilityDelete,
						insert: mockAbilityInsert,
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockUpdate.mockReturnValue({ eq: mockEq });
			mockEq.mockReturnValue({ select: mockSelect });
			mockSelect.mockReturnValue({ single: mockSingle });
			mockAbilityDelete.mockReturnValue({ eq: mockAbilityEq });

			const result = await repository.update(baseStaffRow.id, {
				name: '更新後スタッフ',
				kana: 'こうしんごすたっふ',
				email: 'updated@example.com',
				note: '更新されたメモ',
				service_type_ids: [serviceTypeIds.three],
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				name: '更新後スタッフ',
				kana: 'こうしんごすたっふ',
				email: 'updated@example.com',
				note: '更新されたメモ',
			});
			expect(mockAbilityInsert).toHaveBeenCalledWith([
				{ staff_id: baseStaffRow.id, service_type_id: serviceTypeIds.three },
			]);
			expect(result.name).toBe('更新後スタッフ');
			expect(result.service_type_ids).toEqual([serviceTypeIds.three]);
		});

		it('kanaがnullの場合はnullとして更新される', async () => {
			const updatedRow = {
				...baseStaffRow,
				kana: null,
			};

			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: updatedRow, error: null });

			const mockAbilityDelete = vi.fn().mockReturnThis();
			const mockAbilityEq = vi.fn().mockResolvedValue({ error: null });
			const mockAbilityInsert = vi.fn().mockResolvedValue({ error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { update: mockUpdate };
				}
				if (table === 'staff_service_type_abilities') {
					return {
						delete: mockAbilityDelete,
						insert: mockAbilityInsert,
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockUpdate.mockReturnValue({ eq: mockEq });
			mockEq.mockReturnValue({ select: mockSelect });
			mockSelect.mockReturnValue({ single: mockSingle });
			mockAbilityDelete.mockReturnValue({ eq: mockAbilityEq });

			await repository.update(baseStaffRow.id, {
				name: '管理者A',
				kana: null,
				service_type_ids: [],
			});

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ kana: null }),
			);
		});
	});

	describe('delete', () => {
		it('スタッフを削除できる', async () => {
			const mockDelete = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({ error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { delete: mockDelete };
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockDelete.mockReturnValue({ eq: mockEq });

			await repository.delete(baseStaffRow.id);

			expect(mockDelete).toHaveBeenCalled();
			expect(mockEq).toHaveBeenCalledWith('id', baseStaffRow.id);
		});
	});

	describe('normalizeSearchQuery', () => {
		it('括弧とコンマを除去する', () => {
			expect(normalizeSearchQuery('テスト(A),B')).toBe('テストAB');
		});

		it('全角スペースを半角スペースに変換する', () => {
			expect(normalizeSearchQuery('ヘルパー　10')).toBe('ヘルパー 10');
		});

		it('連続スペースを単一スペースに圧縮する', () => {
			expect(normalizeSearchQuery('ヘルパー  10')).toBe('ヘルパー 10');
		});

		it('前後のスペースをトリムする', () => {
			expect(normalizeSearchQuery('  テスト  ')).toBe('テスト');
		});

		it('空文字はそのまま返す', () => {
			expect(normalizeSearchQuery('')).toBe('');
		});

		it('スペースのみは空文字になる', () => {
			expect(normalizeSearchQuery('   ')).toBe('');
		});
	});

	describe('compactQuery', () => {
		it('スペースを完全除去する', () => {
			expect(compactQuery('ヘルパー 10')).toBe('ヘルパー10');
		});

		it('連続スペースも完全除去する', () => {
			expect(compactQuery('ヘルパー  10  号')).toBe('ヘルパー10号');
		});

		it('スペースなし文字列はそのまま返す', () => {
			expect(compactQuery('ヘルパー10')).toBe('ヘルパー10');
		});
	});

	describe('searchByNameOrKana', () => {
		it('名前でケースインセンシティブ検索ができる', async () => {
			const staffRows = [
				{ ...baseStaffRow, kana: 'かんりしゃえー' },
				{
					...baseStaffRow,
					id: TEST_IDS.STAFF_2,
					name: '山田花子',
					kana: 'やまだはなこ',
					role: 'helper' as const,
				},
			];
			const abilityRows = [
				{ staff_id: staffRows[0].id, service_type_id: serviceTypeIds.one },
				{ staff_id: staffRows[1].id, service_type_id: serviceTypeIds.two },
			];

			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockStaffOr = vi.fn().mockReturnThis();
			const mockStaffOrder = vi.fn().mockReturnThis();
			const mockStaffLimit = vi
				.fn()
				.mockResolvedValue({ data: staffRows, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: abilityRows, error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { select: mockStaffSelect };
				}
				if (table === 'staff_service_type_abilities') {
					return { select: mockAbilitySelect };
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ or: mockStaffOr });
			mockStaffOr.mockReturnValue({ order: mockStaffOrder });
			mockStaffOrder.mockReturnValue({ limit: mockStaffLimit });

			mockAbilitySelect.mockReturnValue({ in: mockAbilityIn });

			const result = await repository.searchByNameOrKana(officeId, '山田', 10);

			expect(result).toHaveLength(2);
			expect(mockStaffOr).toHaveBeenCalledWith(
				'name.ilike.%山田%,kana.ilike.%山田%',
			);
			expect(mockStaffLimit).toHaveBeenCalledWith(10);
		});

		it('kanaでひらがな検索ができる', async () => {
			const staffRows = [
				{
					...baseStaffRow,
					id: TEST_IDS.STAFF_3,
					name: '田中太郎',
					kana: 'たなかたろう',
					role: 'helper' as const,
				},
			];
			const abilityRows = [
				{ staff_id: staffRows[0].id, service_type_id: serviceTypeIds.one },
			];

			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockStaffOr = vi.fn().mockReturnThis();
			const mockStaffOrder = vi.fn().mockReturnThis();
			const mockStaffLimit = vi
				.fn()
				.mockResolvedValue({ data: staffRows, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: abilityRows, error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { select: mockStaffSelect };
				}
				if (table === 'staff_service_type_abilities') {
					return { select: mockAbilitySelect };
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ or: mockStaffOr });
			mockStaffOr.mockReturnValue({ order: mockStaffOrder });
			mockStaffOrder.mockReturnValue({ limit: mockStaffLimit });

			mockAbilitySelect.mockReturnValue({ in: mockAbilityIn });

			const result = await repository.searchByNameOrKana(
				officeId,
				'たなか',
				10,
			);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('田中太郎');
			expect(mockStaffOr).toHaveBeenCalledWith(
				'name.ilike.%たなか%,kana.ilike.%たなか%',
			);
		});

		it('上限件数を指定できる', async () => {
			const mockStaffSelect = vi.fn().mockReturnThis();
			const mockStaffEq = vi.fn().mockReturnThis();
			const mockStaffOr = vi.fn().mockReturnThis();
			const mockStaffOrder = vi.fn().mockReturnThis();
			const mockStaffLimit = vi
				.fn()
				.mockResolvedValue({ data: [], error: null });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') {
					return { select: mockStaffSelect };
				}
				if (table === 'staff_service_type_abilities') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: [], error: null }),
						}),
					};
				}
				throw new Error(`Unexpected table: ${table}`);
			});

			mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
			mockStaffEq.mockReturnValue({ or: mockStaffOr });
			mockStaffOr.mockReturnValue({ order: mockStaffOrder });
			mockStaffOrder.mockReturnValue({ limit: mockStaffLimit });

			await repository.searchByNameOrKana(officeId, 'test', 5);

			expect(mockStaffLimit).toHaveBeenCalledWith(5);
		});

		it('空文字クエリの場合は空配列を返す（全件ヒット防止）', async () => {
			// safeQuery が空文字になるケース（空文字、特殊文字のみ）
			const result = await repository.searchByNameOrKana(officeId, '', 10);

			expect(result).toEqual([]);
			// DB にはアクセスしない
			expect(supabase.from).not.toHaveBeenCalled();
		});

		it('特殊文字のみの場合は空配列を返す', async () => {
			// PostgREST 構文インジェクション対策で除去される文字のみ
			const result = await repository.searchByNameOrKana(officeId, '()', 10);

			expect(result).toEqual([]);
			expect(supabase.from).not.toHaveBeenCalled();
		});

		it('空白のみ入力は空配列を返す（全角スペース含む）', async () => {
			// スペースのみ入力は normalizeSearchQuery で空文字になる
			const result1 = await repository.searchByNameOrKana(officeId, '   ', 10);
			const result2 = await repository.searchByNameOrKana(officeId, '　　', 10); // 全角スペースのみ

			expect(result1).toEqual([]);
			expect(result2).toEqual([]);
			expect(supabase.from).not.toHaveBeenCalled();
		});

		/**
		 * ヘルパー用共通モックセットアップ（検索チェーン）
		 * first call: スペースありクエリで0件, second call: スペースなしクエリで結果あり
		 */
		it('半角スペースあり → スペースなしのDB名前にヒット（コンパクト再検索）', async () => {
			const helperRow = {
				...baseStaffRow,
				id: TEST_IDS.STAFF_2,
				name: 'ヘルパー10',
				kana: null,
				role: 'helper' as const,
			};

			// 1回目の検索（"ヘルパー 10"）は0件、2回目（"ヘルパー10"）は1件
			const mockStaffLimit = vi
				.fn()
				.mockResolvedValueOnce({ data: [], error: null })
				.mockResolvedValueOnce({ data: [helperRow], error: null });
			const mockStaffOrder = vi.fn().mockReturnValue({ limit: mockStaffLimit });
			const mockStaffOr = vi.fn().mockReturnValue({ order: mockStaffOrder });
			const mockStaffEq = vi.fn().mockReturnValue({ or: mockStaffOr });
			const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq });

			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: [], error: null });
			const mockAbilitySelect = vi.fn().mockReturnValue({ in: mockAbilityIn });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') return { select: mockStaffSelect };
				if (table === 'staff_service_type_abilities')
					return { select: mockAbilitySelect };
				throw new Error(`Unexpected table: ${table}`);
			});

			const result = await repository.searchByNameOrKana(
				officeId,
				'ヘルパー 10',
				10,
			);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('ヘルパー10');
			// 1回目: 正規化クエリ, 2回目: コンパクトクエリ
			expect(mockStaffOr).toHaveBeenNthCalledWith(
				1,
				'name.ilike.%ヘルパー 10%,kana.ilike.%ヘルパー 10%',
			);
			expect(mockStaffOr).toHaveBeenNthCalledWith(
				2,
				'name.ilike.%ヘルパー10%,kana.ilike.%ヘルパー10%',
			);
		});

		it('全角スペースあり → スペースなしのDB名前にヒット（コンパクト再検索）', async () => {
			const helperRow = {
				...baseStaffRow,
				id: TEST_IDS.STAFF_2,
				name: 'ヘルパー10',
				kana: null,
				role: 'helper' as const,
			};

			// 1回目（"ヘルパー 10" に正規化）は0件、2回目（"ヘルパー10"）は1件
			const mockStaffLimit = vi
				.fn()
				.mockResolvedValueOnce({ data: [], error: null })
				.mockResolvedValueOnce({ data: [helperRow], error: null });
			const mockStaffOrder = vi.fn().mockReturnValue({ limit: mockStaffLimit });
			const mockStaffOr = vi.fn().mockReturnValue({ order: mockStaffOrder });
			const mockStaffEq = vi.fn().mockReturnValue({ or: mockStaffOr });
			const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq });

			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: [], error: null });
			const mockAbilitySelect = vi.fn().mockReturnValue({ in: mockAbilityIn });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') return { select: mockStaffSelect };
				if (table === 'staff_service_type_abilities')
					return { select: mockAbilitySelect };
				throw new Error(`Unexpected table: ${table}`);
			});

			// 全角スペースを含むクエリ
			const result = await repository.searchByNameOrKana(
				officeId,
				'ヘルパー\u300010', // 全角スペース
				10,
			);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('ヘルパー10');
			// 全角スペースは半角スペースに正規化されてから検索される
			expect(mockStaffOr).toHaveBeenNthCalledWith(
				1,
				'name.ilike.%ヘルパー 10%,kana.ilike.%ヘルパー 10%',
			);
		});

		it('通常の正規化クエリで見つかる場合はコンパクト再検索しない', async () => {
			const staffRows = [
				{
					...baseStaffRow,
					id: TEST_IDS.STAFF_2,
					name: 'ヘルパー 10',
					kana: null,
					role: 'helper' as const,
				},
			];

			const mockStaffLimit = vi
				.fn()
				.mockResolvedValue({ data: staffRows, error: null });
			const mockStaffOrder = vi.fn().mockReturnValue({ limit: mockStaffLimit });
			const mockStaffOr = vi.fn().mockReturnValue({ order: mockStaffOrder });
			const mockStaffEq = vi.fn().mockReturnValue({ or: mockStaffOr });
			const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEq });

			const mockAbilityIn = vi
				.fn()
				.mockResolvedValue({ data: [], error: null });
			const mockAbilitySelect = vi.fn().mockReturnValue({ in: mockAbilityIn });

			(supabase.from as any).mockImplementation((table: string) => {
				if (table === 'staffs') return { select: mockStaffSelect };
				if (table === 'staff_service_type_abilities')
					return { select: mockAbilitySelect };
				throw new Error(`Unexpected table: ${table}`);
			});

			const result = await repository.searchByNameOrKana(
				officeId,
				'ヘルパー 10',
				10,
			);

			expect(result).toHaveLength(1);
			// _searchWith は1回しか呼ばれない（コンパクト再検索なし）
			expect(mockStaffLimit).toHaveBeenCalledTimes(1);
		});

		// Known limitation: スペースなし入力でDB側にスペースありの名前がある場合はヒットしない
		// 例: query="ヘルパー10", DB name="ヘルパー 10" → ヒットしない（仕様上許容）
	});
});
