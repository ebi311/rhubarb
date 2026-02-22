import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { Shift } from '@/models/shift';
import { Staff, StaffWithServiceTypes } from '@/models/staff';
import { createTestId, TEST_IDS } from '@/test/helpers/testIds';
import { setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	Mocked,
	vi,
} from 'vitest';
import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from './shiftAdjustmentSuggestionService';

const createMockStaffRepository = (): Mocked<StaffRepository> => {
	return {
		findByAuthUserId: vi.fn(),
		listByOffice: vi.fn(),
	} as unknown as Mocked<StaffRepository>;
};

const createMockShiftRepository = (): Mocked<ShiftRepository> => {
	return {
		list: vi.fn(),
	} as unknown as Mocked<ShiftRepository>;
};

const createAdminStaff = (overrides: Partial<Staff> = {}): Staff => ({
	id: TEST_IDS.STAFF_1,
	auth_user_id: createTestId(),
	office_id: TEST_IDS.OFFICE_1,
	name: '管理者A',
	role: 'admin',
	email: null,
	note: null,
	created_at: new Date('2026-01-01T00:00:00Z'),
	updated_at: new Date('2026-01-01T00:00:00Z'),
	...overrides,
});

const createStaffWithServiceTypes = (
	overrides: Partial<StaffWithServiceTypes> = {},
): StaffWithServiceTypes => ({
	...createAdminStaff({ role: 'helper' }),
	service_type_ids: ['life-support'],
	...overrides,
});

const createShift = (overrides: Partial<Shift> = {}): Shift => ({
	id: TEST_IDS.SCHEDULE_1,
	client_id: TEST_IDS.CLIENT_1,
	service_type_id: 'life-support',
	staff_id: TEST_IDS.STAFF_2,
	date: new Date('2026-02-24T00:00:00+09:00'),
	time: {
		start: { hour: 10, minute: 0 },
		end: { hour: 11, minute: 0 },
	},
	status: 'scheduled',
	is_unassigned: false,
	created_at: new Date('2026-02-01T00:00:00Z'),
	updated_at: new Date('2026-02-01T00:00:00Z'),
	...overrides,
});

describe('ShiftAdjustmentSuggestionService', () => {
	let service: ShiftAdjustmentSuggestionService;
	let mockStaffRepo: Mocked<StaffRepository>;
	let mockShiftRepo: Mocked<ShiftRepository>;
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

		mockStaffRepo = createMockStaffRepository();
		mockShiftRepo = createMockShiftRepository();
		mockSupabase = {} as SupabaseClient<Database>;
		service = new ShiftAdjustmentSuggestionService(mockSupabase, {
			staffRepository: mockStaffRepo,
			shiftRepository: mockShiftRepo,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('サービス種別適性と時間重複なしの候補を最大3件返す', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;
		const candidateAId = createTestId();
		const candidateBId = createTestId();
		const candidateCId = createTestId();
		const candidateDId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.listByOffice.mockResolvedValueOnce([
			createStaffWithServiceTypes({
				id: absentStaffId,
				name: '欠勤者',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: candidateAId,
				name: '候補A',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: candidateBId,
				name: '候補B(重複あり)',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: candidateCId,
				name: '候補C(適性なし)',
				service_type_ids: ['physical-care'],
			}),
			createStaffWithServiceTypes({
				id: candidateDId,
				name: '候補D',
				service_type_ids: ['life-support'],
			}),
		]);

		const targetShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			staff_id: absentStaffId,
			date: new Date('2026-02-24T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			service_type_id: 'life-support',
		});
		const overlapShift = createShift({
			id: TEST_IDS.SCHEDULE_2,
			staff_id: candidateBId,
			date: new Date('2026-02-24T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 30 }, end: { hour: 11, minute: 30 } },
		});
		const nonOverlapShift = createShift({
			id: createTestId(),
			staff_id: candidateDId,
			date: new Date('2026-02-24T00:00:00+09:00'),
			time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
		});

		mockShiftRepo.list.mockResolvedValueOnce([
			targetShift,
			overlapShift,
			nonOverlapShift,
		]);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
			memo: '急休',
		});

		expect(mockStaffRepo.listByOffice).toHaveBeenCalledWith(TEST_IDS.OFFICE_1);
		expect(mockShiftRepo.list).toHaveBeenCalledWith(
			expect.objectContaining({
				officeId: TEST_IDS.OFFICE_1,
				status: 'scheduled',
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				startDateTime: setJstTime(new Date('2026-02-22T00:00:00+09:00'), 0, 0),
			}),
		);

		expect(result.affected).toHaveLength(1);
		const [affected] = result.affected;
		expect(affected.shift.id).toBe(TEST_IDS.SCHEDULE_1);
		expect(
			affected.suggestions.map((s) => s.operations[0].to_staff_id),
		).toEqual([candidateAId, candidateDId]);
		expect(affected.suggestions[0]?.rationale.map((r) => r.code)).toEqual([
			'service_type_ok',
			'no_conflict',
		]);
	});

	it('非adminは403', async () => {
		const userId = createTestId();
		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ auth_user_id: userId, role: 'helper' }),
		);

		const promise = service.suggestShiftAdjustments(userId, {
			staffId: TEST_IDS.STAFF_2,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});
		await expect(promise).rejects.toBeInstanceOf(ServiceError);
		await expect(promise).rejects.toMatchObject({ status: 403 });
	});

	it('候補にadminが混ざらない（role===helperのみ）', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;
		const helperCandidateId = createTestId();
		const adminCandidateId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.listByOffice.mockResolvedValueOnce([
			createStaffWithServiceTypes({
				id: absentStaffId,
				name: '欠勤者',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: helperCandidateId,
				name: '候補ヘルパー',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: adminCandidateId,
				name: '候補管理者',
				role: 'admin',
				service_type_ids: ['life-support'],
			}),
		]);

		mockShiftRepo.list.mockResolvedValueOnce([
			createShift({
				id: TEST_IDS.SCHEDULE_1,
				staff_id: absentStaffId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				service_type_id: 'life-support',
			}),
		]);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});

		const toStaffIds = result.affected[0]?.suggestions.map(
			(s) => s.operations[0].to_staff_id,
		);
		expect(toStaffIds).toEqual([helperCandidateId]);
		expect(toStaffIds).not.toContain(adminCandidateId);
	});

	it('欠勤スタッフIDがoffice外/存在しない場合は404', async () => {
		const userId = createTestId();
		const absentStaffId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.listByOffice.mockResolvedValueOnce([
			createStaffWithServiceTypes({
				id: TEST_IDS.STAFF_1,
				name: '別スタッフ',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);
		mockShiftRepo.list.mockResolvedValueOnce([]);

		await expect(
			service.suggestShiftAdjustments(userId, {
				staffId: absentStaffId,
				startDate: new Date('2026-02-22T00:00:00+09:00'),
				endDate: new Date('2026-02-28T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({ status: 404 });
	});

	it('過去のシフトは対象外（当日以降のみ）', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(createAdminStaff());
		mockStaffRepo.listByOffice.mockResolvedValueOnce([
			createStaffWithServiceTypes({
				id: absentStaffId,
				name: '欠勤者',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: createTestId(),
				name: '候補A',
				service_type_ids: ['life-support'],
			}),
		]);

		mockShiftRepo.list.mockResolvedValueOnce([
			createShift({
				id: TEST_IDS.SCHEDULE_1,
				staff_id: absentStaffId,
				date: new Date('2026-02-21T00:00:00+09:00'),
			}),
		]);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-20T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});

		expect(result.affected).toHaveLength(0);
	});
});
