import { ServiceError } from '@/backend/services/basicScheduleService';
import { StaffService } from '@/backend/services/staffService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	createStaffAction,
	deleteStaffAction,
	getStaffAction,
	listStaffsAction,
	updateStaffAction,
} from './staffs';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/staffService', async () => {
	const actual = await vi.importActual<typeof import('@/backend/services/staffService')>(
		'@/backend/services/staffService',
	);
	return {
		...actual,
		StaffService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockService = () => ({
	list: vi.fn(),
	get: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
});

const sampleStaff = {
	id: '019b1d20-0000-4000-8000-000000000111',
	office_id: '019b1d20-0000-4000-8000-000000000222',
	auth_user_id: null,
	name: '山田太郎',
	role: 'admin' as const,
	email: 'yamada@example.com',
	note: 'メモ',
	service_type_ids: ['019b1d20-0000-4000-8000-000000000333'],
	created_at: new Date(),
	updated_at: new Date(),
};

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	mockService = createMockService();
	mockSupabase.auth.getUser.mockReset();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(StaffService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
};

describe('listStaffsAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await listStaffsAction();

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.list).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-1');
		mockService.list.mockRejectedValue(new ServiceError(404, 'Staff not found'));

		const result = await listStaffsAction();

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('スタッフ一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleStaff]);

		const result = await listStaffsAction();

		expect(mockService.list).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ data: [sampleStaff], error: null, status: 200 });
	});
});

describe('getStaffAction', () => {
	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await getStaffAction(sampleStaff.id);
		expect(result.status).toBe(401);
	});

	it('IDがUUIDでなければ400', async () => {
		mockAuthUser('user-1');

		const result = await getStaffAction('invalid');

		expect(result.status).toBe(400);
		expect(mockService.get).not.toHaveBeenCalled();
	});

	it('ServiceErrorを返す', async () => {
		mockAuthUser('user-1');
		mockService.get.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await getStaffAction(sampleStaff.id);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});

	it('スタッフ詳細を取得できる', async () => {
		mockAuthUser('user-1');
		mockService.get.mockResolvedValue(sampleStaff);

		const result = await getStaffAction(sampleStaff.id);

		expect(mockService.get).toHaveBeenCalledWith('user-1', sampleStaff.id);
		expect(result).toEqual({ data: sampleStaff, error: null, status: 200 });
	});
});

describe('createStaffAction', () => {
	const validInput = {
		name: '山田太郎',
		role: 'helper' as const,
		email: 'yamada@example.com',
		note: '備考',
		service_type_ids: ['019b1d20-0000-4000-8000-000000000333'],
	};

	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await createStaffAction(validInput);
		expect(result.status).toBe(401);
	});

	it('バリデーションエラーは400', async () => {
		mockAuthUser('user-1');

		const result = await createStaffAction({ ...validInput, name: '' });

		expect(result.status).toBe(400);
		expect(mockService.create).not.toHaveBeenCalled();
	});

	it('ServiceErrorを返す', async () => {
		mockAuthUser('user-1');
		mockService.create.mockRejectedValue(new ServiceError(403, 'Forbidden'));

		const result = await createStaffAction(validInput);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});

	it('スタッフを作成できる', async () => {
		mockAuthUser('user-1');
		mockService.create.mockResolvedValue(sampleStaff);

		const result = await createStaffAction(validInput);

		expect(mockService.create).toHaveBeenCalledWith('user-1', validInput);
		expect(result.status).toBe(201);
		expect(result.data).toEqual(sampleStaff);
	});
});

describe('updateStaffAction', () => {
	const validInput = {
		name: '更新後',
		role: 'helper' as const,
		email: 'updated@example.com',
		note: null,
		service_type_ids: ['019b1d20-0000-4000-8000-000000000333'],
	};

	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await updateStaffAction(sampleStaff.id, validInput);
		expect(result.status).toBe(401);
	});

	it('IDが不正なら400', async () => {
		mockAuthUser('user-1');

		const result = await updateStaffAction('invalid', validInput);
		expect(result.status).toBe(400);
		expect(mockService.update).not.toHaveBeenCalled();
	});

	it('入力が不正なら400', async () => {
		mockAuthUser('user-1');

		const result = await updateStaffAction(sampleStaff.id, { ...validInput, name: '' });

		expect(result.status).toBe(400);
		expect(mockService.update).not.toHaveBeenCalled();
	});

	it('ServiceErrorを返す', async () => {
		mockAuthUser('user-1');
		mockService.update.mockRejectedValue(new ServiceError(404, 'Staff not found'));

		const result = await updateStaffAction(sampleStaff.id, validInput);

		expect(result.status).toBe(404);
	});

	it('スタッフを更新できる', async () => {
		mockAuthUser('user-1');
		mockService.update.mockResolvedValue(sampleStaff);

		const result = await updateStaffAction(sampleStaff.id, validInput);

		expect(mockService.update).toHaveBeenCalledWith('user-1', sampleStaff.id, validInput);
		expect(result.status).toBe(200);
		expect(result.data).toEqual(sampleStaff);
	});
});

describe('deleteStaffAction', () => {
	it('未認証は401', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await deleteStaffAction(sampleStaff.id);
		expect(result.status).toBe(401);
	});

	it('IDが不正なら400', async () => {
		mockAuthUser('user-1');

		const result = await deleteStaffAction('invalid');

		expect(result.status).toBe(400);
		expect(mockService.delete).not.toHaveBeenCalled();
	});

	it('ServiceErrorを返す', async () => {
		mockAuthUser('user-1');
		mockService.delete.mockRejectedValue(new ServiceError(404, 'Staff not found'));

		const result = await deleteStaffAction(sampleStaff.id);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('スタッフを削除できる', async () => {
		mockAuthUser('user-1');
		mockService.delete.mockResolvedValue(undefined);

		const result = await deleteStaffAction(sampleStaff.id);

		expect(mockService.delete).toHaveBeenCalledWith('user-1', sampleStaff.id);
		expect(result).toEqual({ data: null, error: null, status: 204 });
	});
});
