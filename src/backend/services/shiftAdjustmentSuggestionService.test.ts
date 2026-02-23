import { ClientStaffAssignmentRepository } from '@/backend/repositories/clientStaffAssignmentRepository';
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

		mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
			[
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: candidateAId,
					service_type_id: 'life-support',
				},
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: candidateBId,
					service_type_id: 'life-support',
				},
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: candidateDId,
					service_type_id: 'life-support',
				},
			],
		);

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
		const toStaffIds = affected.suggestions.map((s) => {
			const op = s.operations[0];
			if (!op || op.type !== 'change_staff') {
				throw new Error(`unexpected operation type: ${op?.type ?? 'missing'}`);
			}
			return op.to_staff_id;
		});
		expect(toStaffIds).toEqual([candidateAId, candidateDId]);
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

		mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
			[
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: helperCandidateId,
					service_type_id: 'life-support',
				},
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: adminCandidateId,
					service_type_id: 'life-support',
				},
			],
		);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});

		const toStaffIds = result.affected[0]?.suggestions.map((s) => {
			const op = s.operations[0];
			if (!op || op.type !== 'change_staff') {
				throw new Error(`unexpected operation type: ${op?.type ?? 'missing'}`);
			}
			return op.to_staff_id;
		});
		expect(toStaffIds).toEqual([helperCandidateId]);
		expect(toStaffIds).not.toContain(adminCandidateId);
	});

	it('担当許可がないスタッフは候補から除外される', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;
		const allowedCandidateId = createTestId();
		const notAllowedCandidateId = createTestId();

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

		mockShiftRepo.list.mockResolvedValueOnce([
			createShift({
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				staff_id: absentStaffId,
				date: new Date('2026-02-24T00:00:00+09:00'),
				time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
				service_type_id: 'life-support',
			}),
		]);

		mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
			[
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: allowedCandidateId,
					service_type_id: 'life-support',
				},
			],
		);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});

		const toStaffIds = result.affected[0]?.suggestions.map((s) => {
			const op = s.operations[0];
			if (!op || op.type !== 'change_staff') {
				throw new Error(`unexpected operation type: ${op?.type ?? 'missing'}`);
			}
			return op.to_staff_id;
		});
		expect(toStaffIds).toEqual([allowedCandidateId]);
		expect(toStaffIds).not.toContain(notAllowedCandidateId);
	});

	it('深さ0で解けないが深さ1で解ける場合、operations が2件返る', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;
		const candidateBId = createTestId();
		const candidateCId = createTestId();

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
				id: candidateBId,
				name: '候補B(衝突あり)',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
			createStaffWithServiceTypes({
				id: candidateCId,
				name: '候補C(玉突き先)',
				role: 'helper',
				service_type_ids: ['life-support'],
			}),
		]);

		const shiftX = createShift({
			id: TEST_IDS.SCHEDULE_1,
			client_id: TEST_IDS.CLIENT_1,
			staff_id: absentStaffId,
			date: new Date('2026-02-24T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
			service_type_id: 'life-support',
		});
		const shiftY = createShift({
			id: TEST_IDS.SCHEDULE_2,
			client_id: TEST_IDS.CLIENT_2,
			staff_id: candidateBId,
			date: new Date('2026-02-24T00:00:00+09:00'),
			time: { start: { hour: 10, minute: 30 }, end: { hour: 11, minute: 30 } },
			service_type_id: 'life-support',
		});

		mockShiftRepo.list.mockResolvedValueOnce([shiftX, shiftY]);

		mockClientStaffAssignmentRepo.listLinksByOfficeAndClientIds.mockResolvedValueOnce(
			[
				{
					client_id: TEST_IDS.CLIENT_1,
					staff_id: candidateBId,
					service_type_id: 'life-support',
				},
				{
					client_id: TEST_IDS.CLIENT_2,
					staff_id: candidateCId,
					service_type_id: 'life-support',
				},
			],
		);

		const result = await service.suggestShiftAdjustments(userId, {
			staffId: absentStaffId,
			startDate: new Date('2026-02-22T00:00:00+09:00'),
			endDate: new Date('2026-02-28T00:00:00+09:00'),
		});

		expect(result.affected).toHaveLength(1);
		const [affected] = result.affected;
		expect(affected.shift.id).toBe(TEST_IDS.SCHEDULE_1);
		expect(affected.suggestions).toHaveLength(1);
		const suggestion = affected.suggestions[0]!;
		expect(suggestion.operations).toHaveLength(2);
		expect(suggestion.operations[0]).toMatchObject({
			type: 'change_staff',
			shift_id: TEST_IDS.SCHEDULE_2,
			from_staff_id: candidateBId,
			to_staff_id: candidateCId,
		});
		expect(suggestion.operations[1]).toMatchObject({
			type: 'change_staff',
			shift_id: TEST_IDS.SCHEDULE_1,
			from_staff_id: absentStaffId,
			to_staff_id: candidateBId,
		});
	});

	it('期間が14日を超える場合は400', async () => {
		const userId = createTestId();
		const absentStaffId = TEST_IDS.STAFF_2;

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
		]);
		mockShiftRepo.list.mockResolvedValueOnce([]);

		await expect(
			service.suggestShiftAdjustments(userId, {
				staffId: absentStaffId,
				startDate: new Date('2026-02-22T00:00:00+09:00'),
				endDate: new Date('2026-03-08T00:00:00+09:00'),
			}),
		).rejects.toMatchObject({ status: 400 });
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

	describe('client_datetime_change', () => {
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
				if (
					filters.officeId === TEST_IDS.OFFICE_1 &&
					filters.status === 'scheduled' &&
					start === new Date('2026-02-25T00:00:00+09:00').toISOString() &&
					end === new Date('2026-02-25T00:00:00+09:00').toISOString()
				) {
					return [conflictShiftForA];
				}
				return [];
			});

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
				if (
					filters.officeId === TEST_IDS.OFFICE_1 &&
					filters.status === 'scheduled' &&
					start === new Date('2026-02-25T00:00:00+09:00').toISOString() &&
					end === new Date('2026-02-25T00:00:00+09:00').toISOString()
				) {
					return [conflictShift];
				}
				return [];
			});

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
				if (
					filters.officeId === TEST_IDS.OFFICE_1 &&
					filters.status === 'scheduled' &&
					start === new Date('2026-02-25T00:00:00+09:00').toISOString() &&
					end === new Date('2026-02-25T00:00:00+09:00').toISOString()
				) {
					return [conflictShiftForA];
				}
				return [];
			});

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
