import { DashboardService } from '@/backend/services/dashboardService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { getDashboardDataAction } from './dashboard';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/dashboardService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/dashboardService')
	>('@/backend/services/dashboardService');
	return {
		...actual,
		DashboardService: vi.fn(),
	};
});

// Repositoryのモック
vi.mock('@/backend/repositories/staffRepository', () => ({
	StaffRepository: vi.fn().mockImplementation(function () {
		return {
			findByAuthUserId: vi.fn().mockResolvedValue({
				id: 'staff-1',
				office_id: 'office-1',
				auth_user_id: 'user-1',
				name: 'Admin',
				role: 'admin',
			}),
			findAll: vi.fn().mockResolvedValue([{ id: 'staff-1', name: '田中一郎' }]),
		};
	}),
}));

vi.mock('@/backend/repositories/shiftRepository', () => ({
	ShiftRepository: vi.fn().mockImplementation(function () {
		return {};
	}),
}));

vi.mock('@/backend/repositories/serviceUserRepository', () => ({
	ServiceUserRepository: vi.fn().mockImplementation(function () {
		return {
			findAll: vi
				.fn()
				.mockResolvedValue([{ id: 'client-1', name: '山田太郎' }]),
		};
	}),
}));

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
	from: vi.fn().mockReturnValue({
		select: vi.fn().mockResolvedValue({
			data: [{ id: 'life-support', name: '生活支援' }],
			error: null,
		}),
	}),
};

const createMockService = () => ({
	getDashboardStats: vi.fn(),
	getTodayTimeline: vi.fn(),
	getAlerts: vi.fn(),
});

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	mockService = createMockService();
	mockSupabase.auth.getUser.mockReset();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(DashboardService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

describe('getDashboardDataAction', () => {
	const mockStats = {
		todayShiftCount: 5,
		weekShiftCount: 20,
		unassignedCount: 2,
	};

	const mockTimeline = [
		{
			id: 'shift-1',
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
			clientName: '山田太郎',
			staffName: '田中一郎',
			isUnassigned: false,
			serviceTypeName: '生活支援',
		},
	];

	const mockAlerts = [
		{
			id: 'shift-2',
			type: 'unassigned' as const,
			date: new Date('2026-02-03'),
			startTime: { hour: 14, minute: 0 },
			clientName: '佐藤花子',
			message: '佐藤花子様の14:00からの予定にスタッフが割り当てられていません',
		},
	];

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await getDashboardDataAction();

		expect(result).toEqual({
			data: null,
			error: 'Unauthorized',
			status: 401,
		});
	});

	it('認証済みの場合、ダッシュボードデータを返す', async () => {
		mockAuthUser('user-1');
		mockService.getDashboardStats.mockResolvedValue(mockStats);
		mockService.getTodayTimeline.mockResolvedValue(mockTimeline);
		mockService.getAlerts.mockResolvedValue(mockAlerts);

		const result = await getDashboardDataAction();

		expect(result.status).toBe(200);
		expect(result.data).toEqual({
			stats: mockStats,
			timeline: mockTimeline,
			alerts: mockAlerts,
		});
	});

	it('サービスエラーはエラーレスポンスを返す', async () => {
		mockAuthUser('user-1');
		mockService.getDashboardStats.mockRejectedValue(
			new Error('Database error'),
		);

		const result = await getDashboardDataAction();

		expect(result.status).toBe(500);
		expect(result.error).toBe('Internal server error');
	});
});
