import type { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { ClientStaffAssignmentRepository } from './clientStaffAssignmentRepository';

describe('ClientStaffAssignmentRepository', () => {
	describe('listLinksByOfficeAndClientIds', () => {
		it('office境界（clients/staffs）を考慮してリンクを取得できる', async () => {
			const supabase = {
				from: vi.fn(),
			} as unknown as SupabaseClient<Database>;
			const repository = new ClientStaffAssignmentRepository(supabase);

			const rows = [
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: TEST_IDS.STAFF_2,
					service_type_id: 'life-support',
					clients: { office_id: TEST_IDS.OFFICE_1 },
					staffs: { office_id: TEST_IDS.OFFICE_1 },
				},
			];

			const query = {
				select: vi.fn(),
				eq: vi.fn(),
				in: vi.fn(),
			};
			(supabase.from as any).mockReturnValue(query);
			query.select.mockReturnValue(query);
			query.eq.mockReturnValue(query);
			query.in.mockResolvedValue({ data: rows, error: null });

			const result = await repository.listLinksByOfficeAndClientIds(
				TEST_IDS.OFFICE_1,
				[TEST_IDS.CLIENT_1, TEST_IDS.CLIENT_2],
			);

			expect(supabase.from).toHaveBeenCalledWith('client_staff_assignments');
			expect(query.select).toHaveBeenCalledWith(
				'client_id, staff_id, service_type_id, clients!inner(office_id), staffs!inner(office_id)',
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				1,
				'clients.office_id',
				TEST_IDS.OFFICE_1,
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				2,
				'staffs.office_id',
				TEST_IDS.OFFICE_1,
			);
			expect(query.in).toHaveBeenCalledWith('client_id', [
				TEST_IDS.CLIENT_1,
				TEST_IDS.CLIENT_2,
			]);

			expect(result).toEqual([
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: TEST_IDS.STAFF_2,
					service_type_id: 'life-support',
				},
			]);
		});
	});

	describe('canAssignStaffToClient', () => {
		it('該当レコードが存在する場合はtrueを返す', async () => {
			const supabase = {
				from: vi.fn(),
			} as unknown as SupabaseClient<Database>;
			const repository = new ClientStaffAssignmentRepository(supabase);

			const query = {
				select: vi.fn(),
				eq: vi.fn(),
				maybeSingle: vi.fn(),
			};
			(supabase.from as any).mockReturnValue(query);
			query.select.mockReturnValue(query);
			query.eq.mockReturnValue(query);
			query.maybeSingle.mockResolvedValue({
				data: {
					id: '00000000-0000-4000-8000-000000000000',
					clients: { office_id: TEST_IDS.OFFICE_1 },
					staffs: { office_id: TEST_IDS.OFFICE_1 },
				},
				error: null,
			});

			const result = await repository.canAssignStaffToClient({
				officeId: TEST_IDS.OFFICE_1,
				clientId: TEST_IDS.CLIENT_1,
				staffId: TEST_IDS.STAFF_2,
				serviceTypeId: 'life-support',
			});

			expect(result).toBe(true);
			expect(supabase.from).toHaveBeenCalledWith('client_staff_assignments');
			expect(query.select).toHaveBeenCalledWith(
				'id, clients!inner(office_id), staffs!inner(office_id)',
			);
		});
	});

	describe('findAssignedStaffIdsByClient', () => {
		it('should return staff IDs assigned to a client with service type filter', async () => {
			const supabase = {
				from: vi.fn(),
			} as unknown as SupabaseClient<Database>;
			const repository = new ClientStaffAssignmentRepository(supabase);

			const rows = [
				{
					staff_id: TEST_IDS.STAFF_1,
					clients: { office_id: TEST_IDS.OFFICE_1 },
					staffs: { office_id: TEST_IDS.OFFICE_1 },
				},
				{
					staff_id: TEST_IDS.STAFF_2,
					clients: { office_id: TEST_IDS.OFFICE_1 },
					staffs: { office_id: TEST_IDS.OFFICE_1 },
				},
			];

			const query: any = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			// 最後のeq呼び出しで結果を返す
			query.eq
				.mockReturnValueOnce(query) // clients.office_id
				.mockReturnValueOnce(query) // staffs.office_id
				.mockReturnValueOnce(query) // client_id
				.mockResolvedValueOnce({ data: rows, error: null }); // service_type_id

			(supabase.from as any).mockReturnValue(query);

			const result = await repository.findAssignedStaffIdsByClient(
				TEST_IDS.OFFICE_1,
				TEST_IDS.CLIENT_1,
				'life-support',
			);

			expect(supabase.from).toHaveBeenCalledWith('client_staff_assignments');
			expect(query.select).toHaveBeenCalledWith(
				'staff_id, clients!inner(office_id), staffs!inner(office_id)',
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				1,
				'clients.office_id',
				TEST_IDS.OFFICE_1,
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				2,
				'staffs.office_id',
				TEST_IDS.OFFICE_1,
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				3,
				'client_id',
				TEST_IDS.CLIENT_1,
			);
			expect(query.eq).toHaveBeenNthCalledWith(
				4,
				'service_type_id',
				'life-support',
			);

			expect(result).toEqual([TEST_IDS.STAFF_1, TEST_IDS.STAFF_2]);
		});

		it('should return empty array when no assignments found', async () => {
			const supabase = {
				from: vi.fn(),
			} as unknown as SupabaseClient<Database>;
			const repository = new ClientStaffAssignmentRepository(supabase);

			const query: any = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			query.eq
				.mockReturnValueOnce(query)
				.mockReturnValueOnce(query)
				.mockReturnValueOnce(query)
				.mockResolvedValueOnce({ data: [], error: null });

			(supabase.from as any).mockReturnValue(query);

			const result = await repository.findAssignedStaffIdsByClient(
				TEST_IDS.OFFICE_1,
				TEST_IDS.CLIENT_1,
				'life-support',
			);

			expect(result).toEqual([]);
		});

		it('should throw error if query fails', async () => {
			const supabase = {
				from: vi.fn(),
			} as unknown as SupabaseClient<Database>;
			const repository = new ClientStaffAssignmentRepository(supabase);

			const query: any = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			query.eq
				.mockReturnValueOnce(query)
				.mockReturnValueOnce(query)
				.mockReturnValueOnce(query)
				.mockResolvedValueOnce({
					data: null,
					error: new Error('Query failed'),
				});

			(supabase.from as any).mockReturnValue(query);

			await expect(
				repository.findAssignedStaffIdsByClient(
					TEST_IDS.OFFICE_1,
					TEST_IDS.CLIENT_1,
					'life-support',
				),
			).rejects.toThrow('Query failed');
		});
	});
});
