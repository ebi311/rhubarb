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
	client_id: '33333333-3333-4333-8333-333333333333',
	service_type_id: 'life-support',
	day_of_week: 'Mon',
	time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
	note: 'メモ',
	deleted_at: null,
	created_at: new Date(),
	updated_at: new Date(),
	staff_ids: ['55555555-5555-4555-8555-555555555555'],
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
					id: basicScheduleTemplate.client_id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.staff_ids.map((id) => ({ staff_id: id })),
				error: null,
			},
		});
		basicRepo.findOverlaps.mockResolvedValue([]);

		const service = new BasicScheduleService(supabase, {
			basicScheduleRepository: basicRepo,
			staffRepository: staffRepo,
		});
		const result = await service.create(adminStaff.auth_user_id!, {
			client_id: basicScheduleTemplate.client_id,
			service_type_id: basicScheduleTemplate.service_type_id,
			staff_ids: basicScheduleTemplate.staff_ids,
			weekday: 'Mon',
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
			note: 'メモ',
		});

		expect(result.client_id).toBe(basicScheduleTemplate.client_id);
		expect(result.weekday).toBe('Mon');
		expect(result.staff_ids).toEqual(basicScheduleTemplate.staff_ids);
		expect(basicRepo.create).toHaveBeenCalled();
	});

	it('rejects creation when client is not active', async () => {
		const supabase = makeSupabaseMock({
			clientResult: {
				data: {
					id: basicScheduleTemplate.client_id,
					office_id: adminStaff.office_id,
					contract_status: 'suspended',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.staff_ids.map((id) => ({ staff_id: id })),
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
				client_id: basicScheduleTemplate.client_id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.staff_ids,
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
					id: basicScheduleTemplate.client_id,
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
				client_id: basicScheduleTemplate.client_id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.staff_ids,
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
					id: basicScheduleTemplate.client_id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.staff_ids.map((id) => ({ staff_id: id })),
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
				client_id: basicScheduleTemplate.client_id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.staff_ids,
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
					id: basicScheduleTemplate.client_id,
					office_id: adminStaff.office_id,
					contract_status: 'active',
				},
				error: null,
			},
			abilityResult: {
				data: basicScheduleTemplate.staff_ids.map((id) => ({ staff_id: id })),
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
				client_id: basicScheduleTemplate.client_id,
				service_type_id: basicScheduleTemplate.service_type_id,
				staff_ids: basicScheduleTemplate.staff_ids,
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: 'メモ',
			}),
		).rejects.toBeInstanceOf(ServiceError);
	});
});
