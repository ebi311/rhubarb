import type { Database } from '@/backend/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffRepository } from './staffRepository';

describe('StaffRepository', () => {
	let supabase: SupabaseClient<Database>;
	let repository: StaffRepository;
	const officeId = '019b179f-c74d-75ef-a328-55a8f65a0d8a';
	const serviceTypeIds = {
		one: '019b1b00-0000-4000-8000-0000000000a1',
		two: '019b1b00-0000-4000-8000-0000000000a2',
		three: '019b1b00-0000-4000-8000-0000000000a3',
	};
	const baseStaffRow = {
		id: '019b1aaf-0000-4000-8000-000000000001',
		office_id: officeId,
		name: '管理者A',
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
					id: '019b1aaf-0000-4000-8000-000000000002',
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
			const mockStaffOrder = vi.fn().mockResolvedValue({ data: staffRows, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi.fn().mockResolvedValue({ data: abilityRows, error: null });

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
			expect(result[0].service_type_ids).toEqual([serviceTypeIds.one, serviceTypeIds.two]);
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
			const mockMaybeSingle = vi.fn().mockResolvedValue({ data: baseStaffRow, error: null });

			const mockAbilitySelect = vi.fn().mockReturnThis();
			const mockAbilityIn = vi.fn().mockResolvedValue({
				data: [{ staff_id: baseStaffRow.id, service_type_id: serviceTypeIds.one }],
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
			const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

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
				id: '019b1aaf-0000-4000-8000-000000000099',
				note: 'メモ',
			};
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({ data: insertRow, error: null });

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
				role: 'helper' as const,
				email: 'new@example.com',
				note: 'メモ',
				service_type_ids: [serviceTypeIds.one, serviceTypeIds.two],
			};

			const result = await repository.create(input);

			expect(mockInsert).toHaveBeenCalledWith({
				office_id: input.office_id,
				name: input.name,
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
			expect(result.service_type_ids).toEqual([serviceTypeIds.one, serviceTypeIds.two]);
		});
	});

	describe('update', () => {
		it('スタッフ情報とサービス区分を更新できる', async () => {
			const updatedRow = {
				...baseStaffRow,
				name: '更新後スタッフ',
				email: 'updated@example.com',
				note: '更新されたメモ',
			};

			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });

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
				email: 'updated@example.com',
				note: '更新されたメモ',
				service_type_ids: [serviceTypeIds.three],
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				name: '更新後スタッフ',
				email: 'updated@example.com',
				note: '更新されたメモ',
			});
			expect(mockAbilityInsert).toHaveBeenCalledWith([
				{ staff_id: baseStaffRow.id, service_type_id: serviceTypeIds.three },
			]);
			expect(result.name).toBe('更新後スタッフ');
			expect(result.service_type_ids).toEqual([serviceTypeIds.three]);
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
});
