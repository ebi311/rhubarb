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
});
