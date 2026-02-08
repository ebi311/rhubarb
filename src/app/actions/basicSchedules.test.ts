import {
	BasicScheduleService,
	ServiceError,
} from '@/backend/services/basicScheduleService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	batchSaveBasicSchedulesAction,
	listBasicSchedulesAction,
} from './basicSchedules';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/basicScheduleService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/basicScheduleService')
	>('@/backend/services/basicScheduleService');
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
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

describe('listBasicSchedulesAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await listBasicSchedulesAction();

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.list).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-1');
		mockService.list.mockRejectedValue(
			new ServiceError(404, 'Staff not found'),
		);

		const result = await listBasicSchedulesAction();

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('フィルタなしで一覧を返す', async () => {
		mockAuthUser('user-1');
		mockService.list.mockResolvedValue([sampleSchedule]);

		const result = await listBasicSchedulesAction();

		expect(mockService.list).toHaveBeenCalledWith('user-1', {
			includeDeleted: false,
		});
		expect(result).toEqual({
			data: [sampleSchedule],
			error: null,
			status: 200,
		});
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

		const result = await listBasicSchedulesAction({
			client_id: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.list).not.toHaveBeenCalled();
	});

	it('無効な曜日は400を返す', async () => {
		mockAuthUser('user-1');

		const result = await listBasicSchedulesAction({
			weekday: 'INVALID' as 'Mon',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.list).not.toHaveBeenCalled();
	});
});

const validClientId = '019b1d20-0000-4000-8000-000000000001';
const validScheduleId = '019b1d20-0000-4000-8000-000000000002';
const validStaffId = '019b1d20-0000-4000-8000-000000000003';

describe('batchSaveBasicSchedulesAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [],
			delete: [],
		});

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
	});

	it('無効なclientIdは400を返す', async () => {
		mockAuthUser('user-1');

		const result = await batchSaveBasicSchedulesAction('invalid-uuid', {
			create: [],
			update: [],
			delete: [],
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Invalid clientId');
	});

	it('無効なoperationsは400を返す（update.idが無効なUUID）', async () => {
		mockAuthUser('user-1');

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [
				{
					id: 'invalid-uuid',
					input: {
						client_id: validClientId,
						service_type_id: 'physical-care',
						staff_ids: [],
						weekday: 'Mon',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						note: null,
					},
				},
			],
			delete: [],
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Invalid operations');
	});

	it('無効なoperationsは400を返す（delete配列に無効なUUID）', async () => {
		mockAuthUser('user-1');

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [],
			delete: ['invalid-uuid'],
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Invalid operations');
	});

	it('無効なoperationsは400を返す（create内の時間範囲が無効）', async () => {
		mockAuthUser('user-1');

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [
				{
					client_id: validClientId,
					service_type_id: 'physical-care',
					staff_ids: [],
					weekday: 'Mon',
					start_time: { hour: 12, minute: 0 },
					end_time: { hour: 10, minute: 0 }, // 終了時刻が開始時刻より前
					note: null,
				},
			],
			update: [],
			delete: [],
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Invalid operations');
	});

	it('空のoperationsで成功を返す', async () => {
		mockAuthUser('user-1');

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [],
			delete: [],
		});

		expect(result.status).toBe(200);
		expect(result.data).toEqual({ created: 0, updated: 0, deleted: 0 });
	});

	it('create操作を実行する', async () => {
		mockAuthUser('user-1');
		mockService.create.mockResolvedValue(sampleSchedule);

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [
				{
					client_id: validClientId,
					service_type_id: 'physical-care',
					staff_ids: [validStaffId],
					weekday: 'Mon',
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					note: 'テスト',
				},
			],
			update: [],
			delete: [],
		});

		expect(result.status).toBe(200);
		expect(result.data).toEqual({ created: 1, updated: 0, deleted: 0 });
		expect(mockService.create).toHaveBeenCalledTimes(1);
	});

	it('update操作を実行する', async () => {
		mockAuthUser('user-1');
		mockService.update.mockResolvedValue(sampleSchedule);

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [
				{
					id: validScheduleId,
					input: {
						client_id: validClientId,
						service_type_id: 'physical-care',
						staff_ids: [validStaffId],
						weekday: 'Mon',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						note: '更新テスト',
					},
				},
			],
			delete: [],
		});

		expect(result.status).toBe(200);
		expect(result.data).toEqual({ created: 0, updated: 1, deleted: 0 });
		expect(mockService.update).toHaveBeenCalledTimes(1);
	});

	it('delete操作を実行する', async () => {
		mockAuthUser('user-1');
		mockService.delete.mockResolvedValue(undefined);

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [],
			update: [],
			delete: [validScheduleId],
		});

		expect(result.status).toBe(200);
		expect(result.data).toEqual({ created: 0, updated: 0, deleted: 1 });
		expect(mockService.delete).toHaveBeenCalledTimes(1);
	});

	it('部分失敗時は207と詳細を返す', async () => {
		mockAuthUser('user-1');
		mockService.create.mockResolvedValue(sampleSchedule);
		mockService.delete.mockRejectedValue(
			new ServiceError(404, 'Basic schedule not found'),
		);

		const result = await batchSaveBasicSchedulesAction(validClientId, {
			create: [
				{
					client_id: validClientId,
					service_type_id: 'physical-care',
					staff_ids: [],
					weekday: 'Mon',
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					note: null,
				},
			],
			update: [],
			delete: [validScheduleId],
		});

		expect(result.status).toBe(207);
		expect(result.error).toBe('Partial failure');
		expect(result.details).toEqual({
			result: { created: 1, updated: 0, deleted: 0 },
			errors: [
				{
					operation: 'delete',
					index: 0,
					id: validScheduleId,
					error: 'Basic schedule not found',
					details: undefined,
				},
			],
		});
	});
});
