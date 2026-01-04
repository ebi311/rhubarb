import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listClientStaffAssignmentsAction } from './clientStaffAssignments';

vi.mock('@/utils/supabase/server');

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
	from: vi.fn(),
};

const staffQuery = {
	select: vi.fn(),
	eq: vi.fn(),
	maybeSingle: vi.fn(),
};

const assignmentQuery = {
	select: vi.fn(),
	eq: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	staffQuery.select.mockReturnValue(staffQuery);
	staffQuery.eq.mockReturnValue(staffQuery);
	staffQuery.maybeSingle.mockReset();
	assignmentQuery.select.mockReturnValue(assignmentQuery);
	assignmentQuery.eq.mockReset();
	mockSupabase.from.mockImplementation((table: string) => {
		if (table === 'staffs') {
			return staffQuery;
		}
		if (table === 'client_staff_assignments') {
			return assignmentQuery;
		}
		throw new Error(`Unexpected table: ${table}`);
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
};

describe('listClientStaffAssignmentsAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await listClientStaffAssignmentsAction();

		expect(result.status).toBe(401);
		expect(staffQuery.maybeSingle).not.toHaveBeenCalled();
	});

	it('管理者でない場合は403', async () => {
		mockAuthUser('user-1');
		staffQuery.maybeSingle.mockResolvedValue({
			data: { office_id: 'office-1', role: 'helper' },
			error: null,
		});

		const result = await listClientStaffAssignmentsAction();

		expect(result.status).toBe(403);
		expect(assignmentQuery.eq).not.toHaveBeenCalled();
	});

	it('取得時にエラーがあれば500', async () => {
		mockAuthUser('user-1');
		staffQuery.maybeSingle.mockResolvedValue({
			data: { office_id: 'office-1', role: 'admin' },
			error: null,
		});
		assignmentQuery.eq.mockResolvedValue({ data: null, error: { message: 'db-error' } });

		const result = await listClientStaffAssignmentsAction();

		expect(result.status).toBe(500);
		expect(result.error).toBe('Failed to fetch client staff assignments');
	});

	it('許可リストを返す', async () => {
		mockAuthUser('user-1');
		staffQuery.maybeSingle.mockResolvedValue({
			data: { office_id: 'office-1', role: 'admin' },
			error: null,
		});
		assignmentQuery.eq.mockResolvedValue({
			data: [
				{
					client_id: '019b8b17-5b02-74ed-a77e-724d384629aa',
					service_type_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
					staff_id: '019b8b1a-5979-766e-a500-7334e4af217b',
				},
				{
					client_id: '019b8b17-5b02-74ed-a77e-724d384629ab',
					service_type_id: '019b8b17-b254-7296-a008-cab6ca77f3a3',
					staff_id: '019b8b1a-5979-766e-a500-7334e4af217c',
				},
			],
			error: null,
		});

		const result = await listClientStaffAssignmentsAction();

		expect(assignmentQuery.select).toHaveBeenCalledWith(
			'client_id, service_type_id, staff_id, clients!inner(office_id)',
		);
		expect(assignmentQuery.eq).toHaveBeenCalledWith('clients.office_id', 'office-1');
		expect(result).toEqual({
			data: [
				{
					client_id: '019b8b17-5b02-74ed-a77e-724d384629aa',
					service_type_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
					staff_id: '019b8b1a-5979-766e-a500-7334e4af217b',
				},
				{
					client_id: '019b8b17-5b02-74ed-a77e-724d384629ab',
					service_type_id: '019b8b17-b254-7296-a008-cab6ca77f3a3',
					staff_id: '019b8b1a-5979-766e-a500-7334e4af217c',
				},
			],
			error: null,
			status: 200,
		});
	});

	it('データが不正な場合は500', async () => {
		mockAuthUser('user-1');
		staffQuery.maybeSingle.mockResolvedValue({
			data: { office_id: 'office-1', role: 'admin' },
			error: null,
		});
		assignmentQuery.eq.mockResolvedValue({
			data: [{ client_id: 'client-1', service_type_id: 'svc-1', staff_id: null }],
			error: null,
		});

		const result = await listClientStaffAssignmentsAction();

		expect(result.status).toBe(500);
		expect(result.error).toBe('Invalid client staff assignment data');
	});
});
