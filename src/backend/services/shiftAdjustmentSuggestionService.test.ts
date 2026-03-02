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
});
