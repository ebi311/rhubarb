import { ClientStaffAssignmentRepository } from '@/backend/repositories/clientStaffAssignmentRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { Shift } from '@/models/shift';
import { Staff, StaffWithServiceTypes } from '@/models/staff';
import { createTestId, TEST_IDS } from '@/test/helpers/testIds';
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
import { ShiftAdjustmentSuggestionService } from './shiftAdjustmentSuggestionService';

const createMockStaffRepository = (): Mocked<StaffRepository> => {
	return {
		findByAuthUserId: vi.fn(),
		listByOffice: vi.fn(),
	} as unknown as Mocked<StaffRepository>;
};

const createMockShiftRepository = (): Mocked<ShiftRepository> => {
	return {
		list: vi.fn(),
		findById: vi.fn(),
	} as unknown as Mocked<ShiftRepository>;
};

const createMockClientStaffAssignmentRepository =
	(): Mocked<ClientStaffAssignmentRepository> => {
		return {
			listLinksByOfficeAndClientIds: vi.fn(),
		} as unknown as Mocked<ClientStaffAssignmentRepository>;
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

type ShiftListFilters = Parameters<ShiftRepository['list']>[0];

const buildShiftListKey = (filters: ShiftListFilters = {}): string => {
	// JSON.stringify は Date を toJSON() (= ISO文字列) に変換する
	// undefined は省略されるので、filters の組み合わせで一意なキーになる
	return JSON.stringify({
		officeId: filters.officeId,
		clientId: filters.clientId,
		status: filters.status,
		startDate: filters.startDate,
		endDate: filters.endDate,
		startDateTime: filters.startDateTime,
		endDateTime: filters.endDateTime,
	});
};

const createShiftListMock = (table: Record<string, Shift[]>) => {
	return async (filters: ShiftListFilters = {}) => {
		return table[buildShiftListKey(filters)] ?? [];
	};
};

describe('ShiftAdjustmentSuggestionService', () => {
	let service: ShiftAdjustmentSuggestionService;
	let mockStaffRepo: Mocked<StaffRepository>;
	let mockShiftRepo: Mocked<ShiftRepository>;
	let mockClientStaffAssignmentRepo: Mocked<ClientStaffAssignmentRepository>;
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

		mockStaffRepo = createMockStaffRepository();
		mockShiftRepo = createMockShiftRepository();
		mockClientStaffAssignmentRepo = createMockClientStaffAssignmentRepository();
		mockSupabase = {} as SupabaseClient<Database>;
		service = new ShiftAdjustmentSuggestionService(mockSupabase, {
			staffRepository: mockStaffRepo,
			shiftRepository: mockShiftRepo,
			clientStaffAssignmentRepository: mockClientStaffAssignmentRepo,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('client_datetime_change', () => {
		it('非adminは403を返す', async () => {
			const userId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({
					id: createTestId(),
					auth_user_id: userId,
					role: 'helper',
				}),
			);

			await expect(
				service.suggestClientDatetimeChangeAdjustments(userId, {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				}),
			).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
		});

		it('対象shiftが存在しない場合は404を返す', async () => {
			const userId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockShiftRepo.findById.mockResolvedValueOnce(null);

			await expect(
				service.suggestClientDatetimeChangeAdjustments(userId, {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				}),
			).rejects.toMatchObject({ status: 404, message: 'Shift not found' });
		});

		it.each([
			{
				name: 'scheduled以外',
				shift: createShift({ status: 'confirmed' }),
				expectedMessage: 'Shift must be scheduled',
			},
			{
				name: 'staff未設定',
				shift: createShift({ staff_id: null }),
				expectedMessage: 'Shift must have staff_id',
			},
		])('$name の場合は400を返す', async ({ shift, expectedMessage }) => {
			const userId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);

			await expect(
				service.suggestClientDatetimeChangeAdjustments(userId, {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				}),
			).rejects.toMatchObject({ status: 400, message: expectedMessage });
		});

		it('対象shiftがadminのoffice外の場合は404を返す', async () => {
			const userId = createTestId();
			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				date: new Date('2026-02-24T00:00:00+09:00'),
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({
					id: createTestId(),
					auth_user_id: userId,
					office_id: TEST_IDS.OFFICE_1,
				}),
			);
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);
			mockShiftRepo.list.mockResolvedValueOnce([]);

			await expect(
				service.suggestClientDatetimeChangeAdjustments(userId, {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				}),
			).rejects.toMatchObject({ status: 404, message: 'Shift not found' });
		});

		it('staff維持で日時変更できる提案が出る', async () => {
			const userId = createTestId();
			const staffAId = TEST_IDS.STAFF_2;

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: staffAId,
					name: '担当A',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: staffAId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			});
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);
			mockShiftRepo.list.mockImplementation(async (filters = {}) => {
				const start = filters.startDate?.toISOString();
				const end = filters.endDate?.toISOString();
				if (
					filters.officeId === TEST_IDS.OFFICE_1 &&
					filters.clientId === TEST_IDS.CLIENT_1 &&
					start === targetShift.date.toISOString() &&
					end === targetShift.date.toISOString()
				) {
					return [targetShift];
				}
				// newDate 側の検索（衝突なし）
				return [];
			});

			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffAId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.suggestClientDatetimeChangeAdjustments(
				userId,
				{
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				},
			);

			expect(result.target.shift.id).toBe(TEST_IDS.SCHEDULE_1);
			expect(result.target.suggestions).toHaveLength(1);
			expect(result.target.suggestions[0]?.operations).toEqual([
				expect.objectContaining({
					type: 'update_shift_schedule',
					shift_id: TEST_IDS.SCHEDULE_1,
					new_date: new Date('2026-02-25T00:00:00+09:00'),
					new_start_time: { hour: 14, minute: 0 },
					new_end_time: { hour: 15, minute: 0 },
				}),
			]);
		});

		it('staff維持は衝突→staff変更で解決する提案が出る', async () => {
			const userId = createTestId();
			const staffAId = TEST_IDS.STAFF_2;
			const staffBId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: staffAId,
					name: '担当A',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: staffBId,
					name: '候補B',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: staffAId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			});
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);

			const conflictShiftForA = createShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: TEST_IDS.CLIENT_2,
				staff_id: staffAId,
				date: new Date('2026-02-25T00:00:00+09:00'),
				time: {
					start: { hour: 14, minute: 30 },
					end: { hour: 15, minute: 30 },
				},
				status: 'scheduled',
				service_type_id: 'life-support',
			});

			mockShiftRepo.list.mockImplementation(
				createShiftListMock({
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						clientId: TEST_IDS.CLIENT_1,
						startDate: targetShift.date,
						endDate: targetShift.date,
					})]: [targetShift],
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						status: 'scheduled',
						startDate: new Date('2026-02-25T00:00:00+09:00'),
						endDate: new Date('2026-02-25T00:00:00+09:00'),
					})]: [conflictShiftForA],
				}),
			);

			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffAId,
						service_type_id: 'life-support',
					},
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffBId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.suggestClientDatetimeChangeAdjustments(
				userId,
				{
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				},
			);

			expect(result.target.suggestions).toHaveLength(1);
			const suggestion = result.target.suggestions[0]!;
			expect(suggestion.operations).toHaveLength(2);
			expect(suggestion.operations[0]).toMatchObject({
				type: 'change_staff',
				shift_id: TEST_IDS.SCHEDULE_1,
				from_staff_id: staffAId,
				to_staff_id: staffBId,
			});
			expect(suggestion.operations[1]).toMatchObject({
				type: 'update_shift_schedule',
				shift_id: TEST_IDS.SCHEDULE_1,
				new_date: new Date('2026-02-25T00:00:00+09:00'),
				new_start_time: { hour: 14, minute: 0 },
				new_end_time: { hour: 15, minute: 0 },
			});
		});

		it('深さ1（2手）が出る', async () => {
			const userId = createTestId();
			const staffBId = TEST_IDS.STAFF_2;
			const staffCId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: staffBId,
					name: '担当B',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: staffCId,
					name: '玉突き先C',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: staffBId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			});
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);

			const conflictShift = createShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: TEST_IDS.CLIENT_2,
				staff_id: staffBId,
				date: new Date('2026-02-25T00:00:00+09:00'),
				time: {
					start: { hour: 14, minute: 30 },
					end: { hour: 15, minute: 30 },
				},
				status: 'scheduled',
				service_type_id: 'life-support',
			});

			mockShiftRepo.list.mockImplementation(
				createShiftListMock({
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						clientId: TEST_IDS.CLIENT_1,
						startDate: targetShift.date,
						endDate: targetShift.date,
					})]: [targetShift],
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						status: 'scheduled',
						startDate: new Date('2026-02-25T00:00:00+09:00'),
						endDate: new Date('2026-02-25T00:00:00+09:00'),
					})]: [conflictShift],
				}),
			);

			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					// 対象シフトは担当Bのまま（Bがallowlistにある）
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffBId,
						service_type_id: 'life-support',
					},
					// conflictShift は C へ玉突きできる
					{
						client_id: TEST_IDS.CLIENT_2,
						staff_id: staffCId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.suggestClientDatetimeChangeAdjustments(
				userId,
				{
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				},
			);

			expect(result.target.suggestions).toHaveLength(1);
			const suggestion = result.target.suggestions[0]!;
			expect(suggestion.operations).toHaveLength(2);
			expect(suggestion.operations[0]).toMatchObject({
				type: 'change_staff',
				shift_id: TEST_IDS.SCHEDULE_2,
				from_staff_id: staffBId,
				to_staff_id: staffCId,
			});
			expect(suggestion.operations[1]).toMatchObject({
				type: 'update_shift_schedule',
				shift_id: TEST_IDS.SCHEDULE_1,
				new_date: new Date('2026-02-25T00:00:00+09:00'),
				new_start_time: { hour: 14, minute: 0 },
				new_end_time: { hour: 15, minute: 0 },
			});
		});

		it('allowlist無い候補が除外される', async () => {
			const userId = createTestId();
			const staffAId = TEST_IDS.STAFF_2;
			const allowedCandidateId = createTestId();
			const notAllowedCandidateId = createTestId();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: staffAId,
					name: '担当A',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: allowedCandidateId,
					name: '許可あり候補',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: notAllowedCandidateId,
					name: '許可なし候補',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: staffAId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			});

			const conflictShiftForA = createShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: TEST_IDS.CLIENT_2,
				staff_id: staffAId,
				date: new Date('2026-02-25T00:00:00+09:00'),
				time: {
					start: { hour: 14, minute: 30 },
					end: { hour: 15, minute: 30 },
				},
				status: 'scheduled',
				service_type_id: 'life-support',
			});
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);
			mockShiftRepo.list.mockImplementation(
				createShiftListMock({
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						clientId: TEST_IDS.CLIENT_1,
						startDate: targetShift.date,
						endDate: targetShift.date,
					})]: [targetShift],
					[buildShiftListKey({
						officeId: TEST_IDS.OFFICE_1,
						status: 'scheduled',
						startDate: new Date('2026-02-25T00:00:00+09:00'),
						endDate: new Date('2026-02-25T00:00:00+09:00'),
					})]: [conflictShiftForA],
				}),
			);

			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffAId,
						service_type_id: 'life-support',
					},
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: allowedCandidateId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.suggestClientDatetimeChangeAdjustments(
				userId,
				{
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				},
			);

			expect(result.target.suggestions).toHaveLength(1);
			const op = result.target.suggestions[0]?.operations[0];
			if (!op || op.type !== 'change_staff') {
				throw new Error(`unexpected operation type: ${op?.type ?? 'missing'}`);
			}
			expect(op.to_staff_id).toBe(allowedCandidateId);
			expect(op.to_staff_id).not.toBe(notAllowedCandidateId);
		});

		it('maxExecutionMs を極小にして timedOut=true になる', async () => {
			const userId = createTestId();
			const staffAId = TEST_IDS.STAFF_2;

			let t = 0;
			service = new ShiftAdjustmentSuggestionService(mockSupabase, {
				staffRepository: mockStaffRepo,
				shiftRepository: mockShiftRepo,
				clientStaffAssignmentRepository: mockClientStaffAssignmentRepo,
				maxExecutionMs: 0,
				now: () => {
					t += 1;
					return t;
				},
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
				createAdminStaff({ id: createTestId(), auth_user_id: userId }),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: staffAId,
					name: '担当A',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				...Array.from({ length: 50 }).map((_, i) =>
					createStaffWithServiceTypes({
						id: createTestId(),
						name: `候補${i}`,
						role: 'helper',
						service_type_ids: ['life-support'],
					}),
				),
			]);

			const targetShift = createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: staffAId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			});
			mockShiftRepo.findById.mockResolvedValueOnce(targetShift);
			mockShiftRepo.list.mockImplementation(async () => [targetShift]);
			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: staffAId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.suggestClientDatetimeChangeAdjustments(
				userId,
				{
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-25T00:00:00+09:00'),
					newStartTime: { hour: 14, minute: 0 },
					newEndTime: { hour: 15, minute: 0 },
				},
			);

			expect(result.meta?.timedOut).toBe(true);
		});
	});

	describe('findAvailableHelpers', () => {
		it('指定時間帯に空きのあるヘルパーを返す', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();
			const helperCId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperCId,
					name: 'ヘルパーC',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// helperB には 10:00-11:00 にシフトあり（重複）
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperBId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 10, minute: 0 },
						end: { hour: 11, minute: 0 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			});

			// ヘルパーAとCが空き。Bは重複あり
			expect(result).toHaveLength(2);
			expect(result.map((h) => h.name)).toContain('ヘルパーA');
			expect(result.map((h) => h.name)).toContain('ヘルパーC');
			expect(result.map((h) => h.name)).not.toContain('ヘルパーB');
		});

		it('最大5人まで返す', async () => {
			const helpers = Array.from({ length: 10 }).map((_, i) =>
				createStaffWithServiceTypes({
					id: createTestId(),
					name: `ヘルパー${i}`,
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			);
			mockStaffRepo.listByOffice.mockResolvedValueOnce(helpers);
			mockShiftRepo.list.mockResolvedValueOnce([]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			});

			expect(result).toHaveLength(5);
		});

		it('clientId 指定時に serviceTypeId がないとエラー', async () => {
			await expect(
				service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
					date: '2026-02-25',
					startTime: { hour: 10, minute: 0 },
					endTime: { hour: 11, minute: 0 },
					clientId: TEST_IDS.CLIENT_1,
				}),
			).rejects.toThrow('clientId 指定時は serviceTypeId も必須です');
		});

		it('clientId 指定時はその利用者に割当可能なスタッフに絞る', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			mockShiftRepo.list.mockResolvedValueOnce([]);

			// helperA のみ CLIENT_1 に割当可能
			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: helperAId,
						service_type_id: 'life-support',
					},
				],
			);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
			});

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーA');
		});

		it('admin スタッフは結果に含まれない', async () => {
			const adminId = createTestId();
			const helperId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: adminId,
					name: '管理者',
					role: 'admin',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperId,
					name: 'ヘルパー',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			mockShiftRepo.list.mockResolvedValueOnce([]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			});

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパー');
		});

		it('名前順（日本語ロケール）でソートされる', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();
			const helperCId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperCId,
					name: '山田',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperAId,
					name: '伊藤',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: '斎藤',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			mockShiftRepo.list.mockResolvedValueOnce([]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			});

			// 日本語ロケールソート: 伊藤 < 斎藤 < 山田
			expect(result[0]!.name).toBe('伊藤');
			expect(result[1]!.name).toBe('斎藤');
			expect(result[2]!.name).toBe('山田');
		});

		it('シフト間インターバル（30分）を考慮して重複判定する', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// ヘルパーAは 9:00-9:30 にシフトあり
			// 要求時間帯: 9:30-10:30
			// インターバル30分を考慮すると 10:00 まで空きなし → ヘルパーAは対象外
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperAId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 9, minute: 0 },
						end: { hour: 9, minute: 30 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 9, minute: 30 },
				endTime: { hour: 10, minute: 30 },
			});

			// ヘルパーAはインターバル内（9:30 開始だが、既存シフト終了 9:30 + 30分 = 10:00 まで不可）
			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーB');
		});

		it('インターバル後なら空きと判定する', async () => {
			const helperAId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// ヘルパーAは 9:00-9:30 にシフトあり
			// 要求時間帯: 10:00-11:00
			// インターバル30分を考慮しても 10:00 開始なら OK
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperAId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 9, minute: 0 },
						end: { hour: 9, minute: 30 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
			});

			// 9:30 + 30分 = 10:00 なのでギリギリOK
			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーA');
		});

		it('要求終了時刻がインターバルを考慮して既存シフト開始前なら空きと判定する', async () => {
			const helperAId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// ヘルパーAは 11:00-12:00 にシフトあり
			// 要求時間帯: 10:00-10:30
			// 要求終了 10:30 + 30分 = 11:00 で既存シフト開始なのでOK
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperAId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 11, minute: 0 },
						end: { hour: 12, minute: 0 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 10, minute: 30 },
			});

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーA');
		});

		it('要求終了時刻 + インターバルが既存シフト開始を超えていたら対象外', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// ヘルパーAは 11:00-12:00 にシフトあり
			// 要求時間帯: 10:00-10:45
			// 要求終了 10:45 + 30分 = 11:15 で既存シフト開始 11:00 を超えるのでNG
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperAId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 11, minute: 0 },
						end: { hour: 12, minute: 0 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 10, minute: 45 },
			});

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーB');
		});

		it('日付境界付近: 前日23:00終了のシフトがインターバルで翌日0:00開始に衝突する', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			]);

			// ヘルパーAは 2026-02-25 22:30-23:45 にシフトあり
			// 要求時間帯: 2026-02-26 0:00-1:00
			// インターバル30分を考慮すると、ヘルパーAは既存シフト終了 23:45 + 30分 = 翌日 0:15 まで不可
			// → 翌日 0:00-1:00 と衝突する（0:00 < 0:15 なので）
			mockShiftRepo.list.mockResolvedValueOnce([
				createShift({
					id: createTestId(),
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperAId,
					date: new Date('2026-02-25T00:00:00+09:00'),
					time: {
						start: { hour: 22, minute: 30 },
						end: { hour: 23, minute: 45 },
					},
					status: 'scheduled',
				}),
			]);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-26',
				startTime: { hour: 0, minute: 0 },
				endTime: { hour: 1, minute: 0 },
			});

			// ヘルパーAはシフト衝突あり。ヘルパーBのみ空き
			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーB');
		});

		it('clientId/serviceTypeId 指定時はスタッフの service_type_ids もチェックする', async () => {
			const helperAId = createTestId();
			const helperBId = createTestId();

			mockStaffRepo.listByOffice.mockResolvedValueOnce([
				createStaffWithServiceTypes({
					id: helperAId,
					name: 'ヘルパーA',
					role: 'helper',
					// life-support のみ対応可能
					service_type_ids: ['life-support'],
				}),
				createStaffWithServiceTypes({
					id: helperBId,
					name: 'ヘルパーB',
					role: 'helper',
					// physical-care のみ対応可能
					service_type_ids: ['physical-care'],
				}),
			]);

			mockShiftRepo.list.mockResolvedValueOnce([]);

			// 両方とも CLIENT_1 に割当可能なスタッフとして登録されている
			mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
				[
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: helperAId,
						service_type_id: 'life-support',
					},
					{
						client_id: TEST_IDS.CLIENT_1,
						staff_id: helperBId,
						service_type_id: 'life-support', // 紐付け上は life-support だが、スタッフは physical-care のみ対応可
					},
				],
			);

			const result = await service.findAvailableHelpers(TEST_IDS.OFFICE_1, {
				date: '2026-02-25',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				serviceTypeId: 'life-support',
			});

			// ヘルパーBは service_type_ids に life-support がないので除外
			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('ヘルパーA');
		});
	});
});

describe('processStaffAbsence', () => {
	let service: ShiftAdjustmentSuggestionService;
	let mockStaffRepo: Mocked<StaffRepository>;
	let mockShiftRepo: Mocked<ShiftRepository>;
	let mockClientStaffAssignmentRepo: Mocked<ClientStaffAssignmentRepository>;
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

		mockStaffRepo = createMockStaffRepository();
		mockShiftRepo = createMockShiftRepository();
		mockClientStaffAssignmentRepo = createMockClientStaffAssignmentRepository();
		mockSupabase = {} as SupabaseClient<Database>;
		service = new ShiftAdjustmentSuggestionService(mockSupabase, {
			staffRepository: mockStaffRepo,
			shiftRepository: mockShiftRepo,
			clientStaffAssignmentRepository: mockClientStaffAssignmentRepo,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('入力が不正な場合は400を返す', async () => {
		const userId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);

		await expect(
			service.processStaffAbsence(userId, {
				staffId: TEST_IDS.STAFF_2,
				startDate: new Date('2026-02-26T00:00:00+09:00'),
				endDate: new Date('2026-02-25T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({ status: 400, message: 'Validation error' });
	});

	it('非adminは403を返す', async () => {
		const userId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({
				id: createTestId(),
				auth_user_id: userId,
				role: 'helper',
			}),
		);

		await expect(
			service.processStaffAbsence(userId, {
				staffId: TEST_IDS.STAFF_2,
				startDate: new Date('2026-02-25T00:00:00+09:00'),
				endDate: new Date('2026-02-26T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
	});

	it('欠勤スタッフが存在しない場合は404を返す', async () => {
		const userId = createTestId();

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi.fn().mockResolvedValueOnce(null);

		await expect(
			service.processStaffAbsence(userId, {
				staffId: TEST_IDS.STAFF_2,
				startDate: new Date('2026-02-25T00:00:00+09:00'),
				endDate: new Date('2026-02-26T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({
			status: 404,
			message: 'Absence staff not found',
		});
	});

	it('欠勤スタッフがadminと異なるofficeの場合は404を返す', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({
				id: createTestId(),
				auth_user_id: userId,
				office_id: TEST_IDS.OFFICE_1,
			}),
		);
		mockStaffRepo.findById = vi.fn().mockResolvedValueOnce(
			createAdminStaff({
				id: absenceStaffId,
				office_id: TEST_IDS.OFFICE_2, // 別の事業所
			}),
		);

		await expect(
			service.processStaffAbsence(userId, {
				staffId: absenceStaffId,
				startDate: new Date('2026-02-25T00:00:00+09:00'),
				endDate: new Date('2026-02-26T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({
			status: 404,
			message: 'Absence staff not found',
		});
	});

	it('影響シフトがない場合は空配列を返す', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.absenceStaffId).toBe(absenceStaffId);
		expect(result.absenceStaffName).toBe('欠勤者A');
		expect(result.startDate).toBe('2026-02-25');
		expect(result.endDate).toBe('2026-02-26');
		expect(result.meta).toEqual({
			timedOut: false,
			processedCount: 0,
			totalCount: 0,
		});
		expect(result.affectedShifts).toHaveLength(0);
		expect(result.summary).toContain('影響シフト: 0件');
	});

	it('タイムアウト時は partial result を正常系で返す', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const clientId = TEST_IDS.CLIENT_1;

		let t = 0;
		service = new ShiftAdjustmentSuggestionService(mockSupabase, {
			staffRepository: mockStaffRepo,
			shiftRepository: mockShiftRepo,
			clientStaffAssignmentRepository: mockClientStaffAssignmentRepo,
			maxExecutionMs: 1,
			now: () => {
				t += 1;
				return t;
			},
		});

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockStaffRepo.listByOffice.mockResolvedValue([
			createStaffWithServiceTypes({
				id: TEST_IDS.STAFF_3,
				name: '候補者B',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		const affectedShifts = [
			createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: clientId,
				staff_id: absenceStaffId,
				date: new Date('2026-02-25T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			}),
			createShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: clientId,
				staff_id: absenceStaffId,
				date: new Date('2026-02-26T00:00:00+09:00'),
				time: { start: { hour: 12, minute: 0 }, end: { hour: 13, minute: 0 } },
				status: 'scheduled',
				service_type_id: 'life-support',
			}),
		];
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce(affectedShifts);
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValue([TEST_IDS.STAFF_3]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValue([TEST_IDS.STAFF_3]);
		mockShiftRepo.list.mockResolvedValue([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.meta).toEqual({
			timedOut: true,
			processedCount: 1,
			totalCount: 2,
		});
		expect(result.affectedShifts).toHaveLength(1);
		expect(result.affectedShifts[0]?.shift.id).toBe(TEST_IDS.SCHEDULE_1);
		expect(result.summary).toContain('影響シフト: 1/2件');
		expect(result.summary).toContain('一部のみ処理');
	});

	it('影響シフトに対して過去担当者が候補として優先される', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const pastStaffId = TEST_IDS.STAFF_3;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		// 事業所のスタッフ一覧
		mockStaffRepo.listByOffice.mockResolvedValueOnce([
			createStaffWithServiceTypes({
				id: pastStaffId,
				name: '過去担当者B',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		// 影響シフト
		const affectedShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: clientId,
			staff_id: absenceStaffId,
			date: new Date('2026-02-25T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			status: 'scheduled',
			service_type_id: 'life-support',
		});
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([affectedShift]);

		// 過去担当者（shifts completed）
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([pastStaffId]);
		// client_staff_assignments
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([pastStaffId]);

		// 空きヘルパー検索用のシフト一覧（重複チェック）
		mockShiftRepo.list.mockResolvedValueOnce([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.affectedShifts).toHaveLength(1);
		const affected = result.affectedShifts[0]!;
		expect(affected.shift.id).toBe(TEST_IDS.SCHEDULE_1);
		expect(affected.candidates).toHaveLength(1);
		expect(affected.candidates[0]).toMatchObject({
			staffId: pastStaffId,
			staffName: '過去担当者B',
			priority: 'past_assigned',
		});
	});

	it('過去担当者に空きがなければavailable優先度の候補が追加される', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const pastStaffId = TEST_IDS.STAFF_3;
		const availableStaffId = TEST_IDS.STAFF_4;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockStaffRepo.listByOffice.mockResolvedValue([
			createStaffWithServiceTypes({
				id: pastStaffId,
				name: '過去担当者B',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: availableStaffId,
				name: '空きスタッフC',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		const affectedShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: clientId,
			staff_id: absenceStaffId,
			date: new Date('2026-02-25T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			status: 'scheduled',
			service_type_id: 'life-support',
		});
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([affectedShift]);

		// 過去担当者
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([pastStaffId]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([pastStaffId]);

		// 過去担当者は同時間帯に別のシフトあり（空きなし）
		// 空きスタッフCは空き
		const shiftListCallIndex = { count: 0 };
		mockShiftRepo.list.mockImplementation(async () => {
			shiftListCallIndex.count++;
			if (shiftListCallIndex.count === 1) {
				// 最初の呼び出し: 過去担当者の空きチェック（重複あり）
				return [
					createShift({
						id: createTestId(),
						client_id: TEST_IDS.CLIENT_2,
						staff_id: pastStaffId,
						date: new Date('2026-02-25T00:00:00+09:00'),
						time: {
							start: { hour: 10, minute: 0 },
							end: { hour: 11, minute: 0 },
						},
						status: 'scheduled',
					}),
				];
			}
			// 2回目以降: 空きスタッフ検索用（重複なし）
			return [];
		});

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.affectedShifts).toHaveLength(1);
		const affected = result.affectedShifts[0]!;
		expect(affected.candidates.length).toBeGreaterThanOrEqual(1);
		// 空きスタッフCが候補に含まれる（available優先度）
		const availableCandidate = affected.candidates.find(
			(c) => c.staffId === availableStaffId,
		);
		expect(availableCandidate).toBeDefined();
		expect(availableCandidate!.priority).toBe('available');

		// シフト一覧取得が1回だけ呼ばれることを検証（N+1対策）
		expect(mockShiftRepo.list).toHaveBeenCalledTimes(1);
	});

	it('候補は最大3名まで', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);

		// 5人のスタッフ（すべて空き）
		const staffIds = Array.from({ length: 5 }, () => createTestId());
		mockStaffRepo.listByOffice.mockResolvedValue(
			staffIds.map((id, i) =>
				createStaffWithServiceTypes({
					id,
					name: `スタッフ${i + 1}`,
					role: 'helper',
					service_type_ids: ['life-support'],
				}),
			),
		);

		const affectedShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: clientId,
			staff_id: absenceStaffId,
			date: new Date('2026-02-25T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			status: 'scheduled',
			service_type_id: 'life-support',
		});
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([affectedShift]);
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([]);
		mockShiftRepo.list.mockResolvedValue([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.affectedShifts).toHaveLength(1);
		// 候補は最大3名
		expect(result.affectedShifts[0]!.candidates.length).toBeLessThanOrEqual(3);
	});

	it('summaryに影響シフト数と候補がない件数が含まれる', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockStaffRepo.listByOffice.mockResolvedValue([]);

		// 2件の影響シフト（候補なし）
		const affectedShifts = [
			createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: clientId,
				staff_id: absenceStaffId,
				date: new Date('2026-02-25T00:00:00+09:00'),
				status: 'scheduled',
			}),
			createShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: clientId,
				staff_id: absenceStaffId,
				date: new Date('2026-02-26T00:00:00+09:00'),
				status: 'scheduled',
			}),
		];
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce(affectedShifts);
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValue([]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValue([]);
		mockShiftRepo.list.mockResolvedValue([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.meta).toEqual({
			timedOut: false,
			processedCount: 2,
			totalCount: 2,
		});
		expect(result.summary).toContain('影響シフト: 2件');
		expect(result.summary).toContain('候補なし: 2件');
	});

	it('過去担当と割当可能スタッフが重複しても重複排除される', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const overlappingStaffId = TEST_IDS.STAFF_3;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockStaffRepo.listByOffice.mockResolvedValue([
			createStaffWithServiceTypes({
				id: overlappingStaffId,
				name: '担当者B',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		const affectedShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: clientId,
			staff_id: absenceStaffId,
			date: new Date('2026-02-25T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			status: 'scheduled',
			service_type_id: 'life-support',
		});
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([affectedShift]);

		// 同じスタッフが過去担当とclient_staff_assignmentsの両方に存在
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([overlappingStaffId]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([overlappingStaffId]);
		mockShiftRepo.list.mockResolvedValue([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.affectedShifts).toHaveLength(1);
		// 重複排除されて1人だけ
		expect(result.affectedShifts[0]!.candidates).toHaveLength(1);
		expect(result.affectedShifts[0]!.candidates[0]!.staffId).toBe(
			overlappingStaffId,
		);
	});

	it('欠勤者自身は候補から除外される', async () => {
		const userId = createTestId();
		const absenceStaffId = TEST_IDS.STAFF_2;
		const clientId = TEST_IDS.CLIENT_1;

		mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(
			createAdminStaff({ id: createTestId(), auth_user_id: userId }),
		);
		mockStaffRepo.findById = vi
			.fn()
			.mockResolvedValueOnce(
				createAdminStaff({ id: absenceStaffId, name: '欠勤者A' }),
			);
		mockStaffRepo.listByOffice.mockResolvedValue([
			createStaffWithServiceTypes({
				id: absenceStaffId,
				name: '欠勤者A',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		const affectedShift = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: clientId,
			staff_id: absenceStaffId,
			date: new Date('2026-02-25T00:00:00+09:00'),
			status: 'scheduled',
			service_type_id: 'life-support',
		});
		mockShiftRepo.findAffectedShiftsByAbsence = vi
			.fn()
			.mockResolvedValueOnce([affectedShift]);
		// 欠勤者が過去担当としても出てくるケース
		mockShiftRepo.findPastAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([absenceStaffId]);
		mockClientStaffAssignmentRepo.findAssignedStaffIdsByClient = vi
			.fn()
			.mockResolvedValueOnce([]);
		mockShiftRepo.list.mockResolvedValue([]);

		const result = await service.processStaffAbsence(userId, {
			staffId: absenceStaffId,
			startDate: new Date('2026-02-25T00:00:00+09:00'),
			endDate: new Date('2026-02-26T00:00:00+09:00'),
		});

		expect(result.affectedShifts).toHaveLength(1);
		// 欠勤者自身は除外
		expect(result.affectedShifts[0]!.candidates).toHaveLength(0);
	});
});
