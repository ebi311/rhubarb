import {
	ServiceError,
	WeeklyScheduleService,
} from '@/backend/services/weeklyScheduleService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	generateWeeklyShiftsAction,
	listMyShiftsAction,
	listShiftsAction,
} from './weeklySchedules';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/weeklyScheduleService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/weeklyScheduleService')
	>('@/backend/services/weeklyScheduleService');
	return {
		...actual,
		WeeklyScheduleService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockService = () => ({
	generateWeeklyShifts: vi.fn(),
	listShifts: vi.fn(),
	listMyShifts: vi.fn(),
});

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	mockService = createMockService();
	mockSupabase.auth.getUser.mockReset();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(WeeklyScheduleService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

describe('generateWeeklyShiftsAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await generateWeeklyShiftsAction('2026-01-19');

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.generateWeeklyShifts).not.toHaveBeenCalled();
	});

	it('月曜日以外の日付は400を返す', async () => {
		mockAuthUser('user-1');

		const result = await generateWeeklyShiftsAction('2026-01-20'); // 火曜日

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
	});

	it('正常な生成結果を返す', async () => {
		mockAuthUser('user-1');
		mockService.generateWeeklyShifts.mockResolvedValue({
			created: 5,
			skipped: 2,
			total: 7,
		});

		const result = await generateWeeklyShiftsAction('2026-01-19'); // 月曜日

		expect(result.status).toBe(201);
		expect(result.data).toEqual({ created: 5, skipped: 2, total: 7 });
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-1');
		mockService.generateWeeklyShifts.mockRejectedValue(
			new ServiceError(403, 'Forbidden'),
		);

		const result = await generateWeeklyShiftsAction('2026-01-19');

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});
});

describe('listShiftsAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await listShiftsAction({
			startDate: '2026-01-19',
			endDate: '2026-01-25',
		});

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
	});

	it('不正な日付範囲は400を返す', async () => {
		mockAuthUser('user-1');

		const result = await listShiftsAction({
			startDate: '2026-01-25',
			endDate: '2026-01-19', // 逆順
		});

		expect(result.status).toBe(400);
	});

	it('正常なシフト一覧を返す', async () => {
		mockAuthUser('user-1');
		const mockShifts = [
			{
				id: 'shift-1',
				client_id: 'client-1',
				service_type_id: 'life-support',
				staff_id: 'staff-1',
				date: new Date('2026-01-19'),
				time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
				status: 'scheduled' as const,
				is_unassigned: false,
				created_at: new Date(),
				updated_at: new Date(),
			},
		];
		mockService.listShifts.mockResolvedValue(mockShifts);

		const result = await listShiftsAction({
			startDate: '2026-01-19',
			endDate: '2026-01-25',
		});

		expect(result.status).toBe(200);
		expect(result.data).toHaveLength(1);
		expect(result.data?.[0].id).toBe('shift-1');
	});
});

describe('listMyShiftsAction', () => {
	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await listMyShiftsAction({
			startDate: '2026-01-19',
			endDate: '2026-01-25',
		});

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
	});

	it('正常な自分のシフト一覧を返す', async () => {
		mockAuthUser('user-helper');
		const mockShifts = [
			{
				id: 'shift-2',
				client_id: 'client-1',
				service_type_id: 'physical-care',
				staff_id: 'staff-helper',
				date: new Date('2026-01-21'),
				time: { start: { hour: 14, minute: 0 }, end: { hour: 15, minute: 0 } },
				status: 'scheduled' as const,
				is_unassigned: false,
				created_at: new Date(),
				updated_at: new Date(),
			},
		];
		mockService.listMyShifts.mockResolvedValue(mockShifts);

		const result = await listMyShiftsAction({
			startDate: '2026-01-19',
			endDate: '2026-01-25',
		});

		expect(result.status).toBe(200);
		expect(result.data).toHaveLength(1);
		expect(result.data?.[0].id).toBe('shift-2');
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-helper');
		mockService.listMyShifts.mockRejectedValue(
			new ServiceError(404, 'Staff not found'),
		);

		const result = await listMyShiftsAction({
			startDate: '2026-01-19',
			endDate: '2026-01-25',
		});

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});
});
