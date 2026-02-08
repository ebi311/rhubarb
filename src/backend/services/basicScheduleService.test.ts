import { BasicScheduleRepository } from '@/backend/repositories/basicScheduleRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import {
	BasicScheduleService,
	ServiceError,
} from '@/backend/services/basicScheduleService';
import { Database } from '@/backend/types/supabase';
import { BasicScheduleWithStaff } from '@/models/basicSchedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

const makeSelectBuilder = <T>(result: T) => {
	const maybeSingle = vi.fn().mockResolvedValue(result);
	const eq = vi.fn().mockReturnThis();
	const select = vi.fn().mockReturnThis();
	return { select, eq, maybeSingle };
};

const makeAbilityBuilder = (result: {
	data: { staff_id: string }[] | null;
	error: unknown;
}) => {
	const select = vi.fn().mockReturnThis();
	const eq = vi.fn().mockReturnThis();
	const inFn = vi.fn().mockResolvedValue(result);
	return { select, eq, in: inFn };
};

const makeSupabaseMock = (options: {
	clientResult: {
		data: { id: string; office_id: string; contract_status: string } | null;
		error: unknown;
	};
	abilityResult: { data: { staff_id: string }[] | null; error: unknown };
}) => {
	const clientBuilder = makeSelectBuilder(options.clientResult);
	const abilityBuilder = makeAbilityBuilder(options.abilityResult);

	const from = vi.fn((table: string) => {
		if (table === 'clients') return clientBuilder;
		if (table === 'staff_service_type_abilities') return abilityBuilder;
		throw new Error(`Unexpected table ${table}`);
	});

	return {
		from,
		_clientBuilder: clientBuilder,
		_abilityBuilder: abilityBuilder,
	} as unknown as SupabaseClient<Database>;
};

const adminStaff = {
	id: '11111111-1111-4111-8111-111111111111',
	office_id: 'aaaa1111-2222-4333-8444-555555555555',
	auth_user_id: 'user-1',
	name: 'Admin',
	role: 'admin' as const,
	email: null,
	created_at: new Date(),
	updated_at: new Date(),
};

const basicScheduleTemplate: BasicScheduleWithStaff = {
	id: '22222222-2222-4222-8222-222222222222',
	clients: {
		id: '33333333-3333-4333-8333-333333333333',
		name: 'Client A',
	},
	service_type_id: 'life-support',
	day_of_week: 'Mon',
	time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
	note: 'メモ',
	deleted_at: null,
	created_at: new Date(),
	updated_at: new Date(),
	assignedStaffs: [
		{
			id: '44444444-4444-4444-8444-444444444444',
			name: 'Staff A',
		},
		{
			id: '55555555-5555-4555-8555-555555555555',
			name: 'Staff B',
		},
	],
};

describe('BasicScheduleService', () => {
	let basicRepo: Mocked<BasicScheduleRepository>;
	let staffRepo: Mocked<StaffRepository>;

	beforeEach(() => {
		basicRepo = {
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			softDelete: vi.fn(),
			list: vi.fn(),
			findOverlaps: vi.fn(),
		} as unknown as Mocked<BasicScheduleRepository>;

		staffRepo = {
			findByAuthUserId: vi.fn().mockResolvedValue(adminStaff),
		} as unknown as Mocked<StaffRepository>;
	});

	it('creates a basic schedule when valid and no overlaps', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.clients.id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
					staff_id: staff.id,
				})),
				error: null,
			},
		});
		basicRepo.findById.mockResolvedValue(basicScheduleTemplate);
		basicRepo.findOverlaps.mockResolvedValue([]);

		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});
		const result = await service.create(adminStaff.auth_user_id!, {
			client_id: basicScheduleTemplate.clients.id,
			service_type_id: basicScheduleTemplate.service_type_id,
			staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
			weekday: 'Mon',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
			note: 'メモ',
		});

		expect(result.id).toBe(basicScheduleTemplate.id);
		expect(result.weekday).toBe('Mon');
		expect(result.staffs).toEqual(basicScheduleTemplate.assignedStaffs);
		expect(basicRepo.create).toHaveBeenCalledWith(
			{
				id: expect.any(String),
				client_id: basicScheduleTemplate.clients.id,
				service_type_id: basicScheduleTemplate.service_type_id,
				day_of_week: 'Mon',
				time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
				note: 'メモ',
				deleted_at: null,
				created_at: expect.any(Date),
				updated_at: expect.any(Date),
			},
			[
				'44444444-4444-4444-8444-444444444444',
				'55555555-5555-4555-8555-555555555555',
			],
		);
	});

	it('rejects creation when client is not active', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.clients.id,
					office_id: adminStaff.office_id,
					contract_status: 'suspended',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
					staff_id: staff.id,
				})),
				error: null,
			},
		});
		basicRepo.findOverlaps.mockResolvedValue([]);
		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});

		await expect(
			service.create(adminStaff.auth_user_id!, {
				client_id: basicScheduleTemplate.clients.id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: 'メモ',
			}),
		).rejects.toBeInstanceOf(ServiceError);
	});

	it('rejects creation when staff is not permitted for client/service', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.clients.id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: { data: [], error: null },
		});
		basicRepo.findOverlaps.mockResolvedValue([]);
		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});

		await expect(
			service.create(adminStaff.auth_user_id!, {
				client_id: basicScheduleTemplate.clients.id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: 'メモ',
			}),
		).rejects.toBeInstanceOf(ServiceError);
	});

	it('rejects creation when overlap exists', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.clients.id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
					staff_id: staff.id,
				})),
				error: null,
			},
		});
		basicRepo.findOverlaps.mockResolvedValue([basicScheduleTemplate]);
		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});

		await expect(
			service.create(adminStaff.auth_user_id!, {
				client_id: basicScheduleTemplate.clients.id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: 'メモ',
			}),
		).rejects.toBeInstanceOf(ServiceError);
	});

	it('rejects update when schedule not found', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.clients.id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
					staff_id: staff.id,
				})),
				error: null,
			},
		});
		basicRepo.findById.mockResolvedValue(null);
		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});

		await expect(
			service.update(adminStaff.auth_user_id!, 'not-found', {
				client_id: basicScheduleTemplate.clients.id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: 'メモ',
			}),
		).rejects.toBeInstanceOf(ServiceError);
	});

	describe('listByClientId', () => {
		it('指定した利用者のスケジュール一覧を返す', async () => {
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: basicScheduleTemplate.clients.id,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: { data: [], error: null },
			});
			basicRepo.list.mockResolvedValue([basicScheduleTemplate]);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.listByClientId(
				adminStaff.auth_user_id!,
				basicScheduleTemplate.clients.id,
			);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(basicScheduleTemplate.id);
			expect(basicRepo.list).toHaveBeenCalledWith({
				client_id: basicScheduleTemplate.clients.id,
				includeDeleted: false,
			});
		});

		it('利用者がアクティブでない場合はエラー', async () => {
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: basicScheduleTemplate.clients.id,
						office_id: adminStaff.office_id,
						contract_status: 'suspended',
					},
					error: null,
				},
				abilityResult: { data: [], error: null },
			});

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			await expect(
				service.listByClientId(
					adminStaff.auth_user_id!,
					basicScheduleTemplate.clients.id,
				),
			).rejects.toBeInstanceOf(ServiceError);
		});
	});

	describe('batchUpsert', () => {
		it('複数のスケジュールを作成できる', async () => {
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: basicScheduleTemplate.clients.id,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: {
					data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
						staff_id: staff.id,
					})),
					error: null,
				},
			});
			basicRepo.findOverlaps.mockResolvedValue([]);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.batchUpsert(
				adminStaff.auth_user_id!,
				basicScheduleTemplate.clients.id,
				{
					create: [
						{
							client_id: basicScheduleTemplate.clients.id,
							service_type_id: 'life-support',
							staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
							weekday: 'Mon',
							start_time: { hour: 9, minute: 0 },
							end_time: { hour: 10, minute: 0 },
							note: null,
						},
						{
							client_id: basicScheduleTemplate.clients.id,
							service_type_id: 'life-support',
							staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
							weekday: 'Tue',
							start_time: { hour: 9, minute: 0 },
							end_time: { hour: 10, minute: 0 },
							note: null,
						},
					],
					update: [],
					delete: [],
				},
			);

			expect(result.created).toBe(2);
			expect(result.updated).toBe(0);
			expect(result.deleted).toBe(0);
			expect(result.errors).toBeUndefined();
			expect(basicRepo.create).toHaveBeenCalledTimes(2);
		});

		it('更新と削除を実行できる', async () => {
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: basicScheduleTemplate.clients.id,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: {
					data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
						staff_id: staff.id,
					})),
					error: null,
				},
			});
			basicRepo.findById.mockResolvedValue(basicScheduleTemplate);
			basicRepo.findOverlaps.mockResolvedValue([]);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.batchUpsert(
				adminStaff.auth_user_id!,
				basicScheduleTemplate.clients.id,
				{
					create: [],
					update: [
						{
							id: basicScheduleTemplate.id,
							data: {
								client_id: basicScheduleTemplate.clients.id,
								service_type_id: 'life-support',
								staff_ids: basicScheduleTemplate.assignedStaffs.map(
									(s) => s.id,
								),
								weekday: 'Wed',
								start_time: { hour: 10, minute: 0 },
								end_time: { hour: 11, minute: 0 },
								note: 'Updated',
							},
						},
					],
					delete: [basicScheduleTemplate.id],
				},
			);

			expect(result.created).toBe(0);
			expect(result.updated).toBe(1);
			expect(result.deleted).toBe(1);
			expect(basicRepo.update).toHaveBeenCalledTimes(1);
			expect(basicRepo.softDelete).toHaveBeenCalledTimes(1);
		});

		it('削除対象のスケジュールが指定clientIdに属していない場合はエラー', async () => {
			// 別の利用者ID（basicScheduleTemplate.clients.id とは異なる）
			const anotherClientId = '66666666-6666-4666-8666-666666666666';
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: anotherClientId,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: {
					data: [],
					error: null,
				},
			});
			// findById は basicScheduleTemplate を返す（clients.id は anotherClientId と異なる）
			basicRepo.findById.mockResolvedValue(basicScheduleTemplate);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.batchUpsert(
				adminStaff.auth_user_id!,
				anotherClientId,
				{
					create: [],
					update: [],
					delete: [basicScheduleTemplate.id],
				},
			);

			expect(result.deleted).toBe(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors?.[0].operation).toBe('delete');
			expect(result.errors?.[0].message).toContain('Client ID mismatch');
			expect(basicRepo.softDelete).not.toHaveBeenCalled();
		});

		it('更新対象のスケジュールが指定clientIdに属していない場合はエラー', async () => {
			// 別の利用者ID（basicScheduleTemplate.clients.id とは異なる）
			const anotherClientId = '66666666-6666-4666-8666-666666666666';
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: anotherClientId,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: {
					data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
						staff_id: staff.id,
					})),
					error: null,
				},
			});
			// findById は basicScheduleTemplate を返す（clients.id は anotherClientId と異なる）
			basicRepo.findById.mockResolvedValue(basicScheduleTemplate);
			basicRepo.findOverlaps.mockResolvedValue([]);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.batchUpsert(
				adminStaff.auth_user_id!,
				anotherClientId,
				{
					create: [],
					update: [
						{
							id: basicScheduleTemplate.id,
							data: {
								client_id: anotherClientId,
								service_type_id: 'life-support',
								staff_ids: basicScheduleTemplate.assignedStaffs.map(
									(s) => s.id,
								),
								weekday: 'Wed',
								start_time: { hour: 10, minute: 0 },
								end_time: { hour: 11, minute: 0 },
								note: null,
							},
						},
					],
					delete: [],
				},
			);

			expect(result.updated).toBe(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors?.[0].operation).toBe('update');
			expect(result.errors?.[0].message).toContain('Client ID mismatch');
			expect(basicRepo.update).not.toHaveBeenCalled();
		});

		it('エラーが発生した操作はスキップして続行する', async () => {
			const supabase = makeSupabaseMock({
				clientResult: {
					data: {
						id: basicScheduleTemplate.clients.id,
						office_id: adminStaff.office_id,
						contract_status: 'active',
					},
					error: null,
				},
				abilityResult: {
					data: basicScheduleTemplate.assignedStaffs.map((staff) => ({
						staff_id: staff.id,
					})),
					error: null,
				},
			});
			// 最初の作成は重複エラー、2番目は成功
			basicRepo.findOverlaps
				.mockResolvedValueOnce([basicScheduleTemplate])
				.mockResolvedValue([]);

			const service = new BasicScheduleService(supabase, {
				basicScheduleRepository: basicRepo,
				staffRepository: staffRepo,
			});

			const result = await service.batchUpsert(
				adminStaff.auth_user_id!,
				basicScheduleTemplate.clients.id,
				{
					create: [
						{
							client_id: basicScheduleTemplate.clients.id,
							service_type_id: 'life-support',
							staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
							weekday: 'Mon',
							start_time: { hour: 9, minute: 0 },
							end_time: { hour: 10, minute: 0 },
							note: null,
						},
						{
							client_id: basicScheduleTemplate.clients.id,
							service_type_id: 'life-support',
							staff_ids: basicScheduleTemplate.assignedStaffs.map((s) => s.id),
							weekday: 'Tue',
							start_time: { hour: 9, minute: 0 },
							end_time: { hour: 10, minute: 0 },
							note: null,
						},
					],
					update: [],
					delete: [],
				},
			);

			expect(result.created).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors?.[0].operation).toBe('create');
			expect(result.errors?.[0].index).toBe(0);
		});
	});
});
