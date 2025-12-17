import { ServiceError, ServiceUserService } from '@/backend/services/serviceUserService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	createServiceUserAction,
	getServiceUsersAction,
	resumeServiceUserAction,
	suspendServiceUserAction,
	updateServiceUserAction,
} from './serviceUsers';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/serviceUserService', async () => {
	const actual = await vi.importActual<typeof import('@/backend/services/serviceUserService')>(
		'@/backend/services/serviceUserService',
	);
	return {
		...actual,
		ServiceUserService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
	from: vi.fn(),
};

const mockService = {
	getServiceUsers: vi.fn(),
	createServiceUser: vi.fn(),
	updateServiceUser: vi.fn(),
	suspendServiceUser: vi.fn(),
	resumeServiceUser: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(ServiceUserService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

describe('getServiceUsersAction', () => {
	it('未認証の場合は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await getServiceUsersAction();

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
	});

	it('スタッフ未登録の場合は404', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.getServiceUsers.mockRejectedValue(new ServiceError(404, 'Staff not found'));

		const result = await getServiceUsersAction();
		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('不正なstatusは400', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.getServiceUsers.mockRejectedValue(
			new ServiceError(400, 'Invalid status parameter'),
		);

		const result = await getServiceUsersAction('invalid' as any);
		expect(result.status).toBe(400);
		expect(result.error).toBe('Invalid status parameter');
	});

	it('利用者一覧を取得できる', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const mockClients = [
			{
				id: 'client-1',
				name: '山田太郎',
				address: '東京都',
				contract_status: 'active',
				office_id: 'office-1',
				created_at: new Date(),
				updated_at: new Date(),
			},
		];

		mockService.getServiceUsers.mockResolvedValue(mockClients);

		const result = await getServiceUsersAction('all');

		expect(mockService.getServiceUsers).toHaveBeenCalledWith('user-1', 'all');
		expect(result).toEqual({ data: mockClients, error: null, status: 200 });
	});
});

describe('createServiceUserAction', () => {
	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await createServiceUserAction({ name: '', address: '' });
		expect(result.status).toBe(401);
	});

	it('管理者以外は403', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.createServiceUser.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await createServiceUserAction({ name: '山田', address: '東京' });
		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});

	it('バリデーションエラーは400', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.createServiceUser.mockRejectedValue(new ServiceError(400, 'Validation error', [1]));

		const result = await createServiceUserAction({ name: '', address: '' });
		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation error');
		expect(result.details).toBeDefined();
	});

	it('正常作成できる', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const mockClient = {
			id: 'client-1',
			name: '山田',
			address: '東京',
			contract_status: 'active',
			office_id: 'office-1',
			created_at: new Date(),
			updated_at: new Date(),
		};

		mockService.createServiceUser.mockResolvedValue(mockClient);

		const result = await createServiceUserAction({ name: '山田', address: '東京' });

		expect(mockService.createServiceUser).toHaveBeenCalledWith('user-1', {
			name: '山田',
			address: '東京',
		});
		expect(result.status).toBe(201);
		expect(result.data).toEqual(mockClient);
	});
});

describe('updateServiceUserAction', () => {
	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await updateServiceUserAction('client-1', { name: '', address: '' });
		expect(result.status).toBe(401);
	});

	it('管理者以外は403', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.updateServiceUser.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await updateServiceUserAction('client-1', { name: '山田', address: '東京' });
		expect(result.status).toBe(403);
	});

	it('他事業所は403', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.updateServiceUser.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await updateServiceUserAction('client-1', { name: '山田', address: '東京' });
		expect(result.status).toBe(403);
	});

	it('バリデーションエラーは400', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.updateServiceUser.mockRejectedValue(new ServiceError(400, 'Validation error', [1]));

		const result = await updateServiceUserAction('client-1', { name: '', address: '' });
		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation error');
	});

	it('正常更新できる', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const mockUpdated = {
			id: 'client-1',
			name: '更新',
			address: '大阪',
			contract_status: 'active',
			office_id: 'office-1',
			created_at: new Date(),
			updated_at: new Date(),
		};

		mockService.updateServiceUser.mockResolvedValue(mockUpdated);

		const result = await updateServiceUserAction('client-1', { name: '更新', address: '大阪' });

		expect(mockService.updateServiceUser).toHaveBeenCalledWith('user-1', 'client-1', {
			name: '更新',
			address: '大阪',
		});
		expect(result.data).toEqual(mockUpdated);
		expect(result.status).toBe(200);
	});
});

describe('suspendServiceUserAction', () => {
	it('管理者以外は403', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		mockService.suspendServiceUser.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await suspendServiceUserAction('client-1');
		expect(result.status).toBe(403);
	});

	it('正常に中断できる', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const mockClient = {
			id: 'client-1',
			name: '山田',
			address: '東京',
			contract_status: 'suspended',
			office_id: 'office-1',
			created_at: new Date(),
			updated_at: new Date(),
		};

		mockService.suspendServiceUser.mockResolvedValue(mockClient);

		const result = await suspendServiceUserAction('client-1');

		expect(mockService.suspendServiceUser).toHaveBeenCalledWith('user-1', 'client-1');
		expect(result.data).toEqual(mockClient);
	});
});

describe('resumeServiceUserAction', () => {
	it('正常に再開できる', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
		const mockClient = {
			id: 'client-1',
			name: '山田',
			address: '東京',
			contract_status: 'active',
			office_id: 'office-1',
			created_at: new Date(),
			updated_at: new Date(),
		};

		mockService.resumeServiceUser.mockResolvedValue(mockClient);

		const result = await resumeServiceUserAction('client-1');

		expect(mockService.resumeServiceUser).toHaveBeenCalledWith('user-1', 'client-1');
		expect(result.data).toEqual(mockClient);
	});
});
