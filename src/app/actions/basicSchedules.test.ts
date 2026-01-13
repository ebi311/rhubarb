import { BasicScheduleService, ServiceError } from '@/backend/services/basicScheduleService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listBasicSchedulesAction } from './basicSchedules';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/basicScheduleService', async () => {
	const actual = await vi.importActual<typeof import('@/backend/services/basicScheduleService')>(
		'@/backend/services/basicScheduleService',
	);
	return {
		...actual,
		BasicScheduleService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockService = () => ({
	list: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
});

const sampleSchedule = {
	id: '019b1d20-0000-4000-8000-000000000001',
	client_id: '019b1d20-0000-4000-8000-000000000002',
	service_type_id: 'life-support',
	staff_ids: ['019b1d20-0000-4000-8000-000000000004'],
	weekday: 'Mon' as const,
	start_time: { hour: 9, minute: 0 },
	end_time: { hour: 10, minute: 0 },
	note: 'メモ',
	deleted_at: null,
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
	(BasicScheduleService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
};

describe('listBasicSchedulesAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await listBasicSchedulesAction();

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.list).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-1');
		mockService.list.mockRejectedValue(new ServiceError(404, 'Staff not found'));

		const result = await listBasicSchedulesAction();

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('フィルタなしで一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleSchedule]);

		const result = await listBasicSchedulesAction();

		expect(mockService.list).toHaveBeenCalledWith('user-1', { includeDeleted: false });
		expect(result).toEqual({ data: [sampleSchedule], error: null, status: 200 });
	});

	it('曜日フィルタを適用して一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleSchedule]);

		const result = await listBasicSchedulesAction({ weekday: 'Mon' });

		expect(result.status).toBe(200);
		expect(mockService.list).toHaveBeenCalledWith('user-1', {
			weekday: 'Mon',
			includeDeleted: false,
		});
	});

	it('利用者フィルタを適用して一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleSchedule]);

		const result = await listBasicSchedulesAction({
			client_id: '019b1d20-0000-4000-8000-000000000002',
		});

		expect(mockService.list).toHaveBeenCalledWith('user-1', {
			client_id: '019b1d20-0000-4000-8000-000000000002',
			includeDeleted: false,
		});
		expect(result.status).toBe(200);
	});

	it('サービス区分フィルタを適用して一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleSchedule]);

		const result = await listBasicSchedulesAction({
			service_type_id: 'life-support',
		});

		expect(mockService.list).toHaveBeenCalledWith('user-1', {
			service_type_id: 'life-support',
			includeDeleted: false,
		});
		expect(result.status).toBe(200);
	});

	it('無効なUUID形式のclient_idは400を返す', async () => {
		mockAuthUser('user-1');

		const result = await listBasicSchedulesAction({ client_id: 'invalid-uuid' });

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.list).not.toHaveBeenCalled();
	});

	it('無効な曜日は400を返す', async () => {
		mockAuthUser('user-1');

		const result = await listBasicSchedulesAction({ weekday: 'INVALID' as 'Mon' });

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.list).not.toHaveBeenCalled();
	});
});
