import { StaffRepository } from '@/backend/repositories/staffRepository';
import type { Database } from '@/backend/types/supabase';
import type { StaffWithServiceTypes } from '@/models/staff';
import { StaffInput } from '@/models/staffActionSchemas';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceError } from './basicScheduleService';
import { StaffService } from './staffService';

const buildSupabase = () =>
	({
		from: vi.fn(),
	}) as unknown as SupabaseClient<Database>;

const ids = {
	staff: '019b1c10-0000-4000-8000-000000000101',
	staffOther: '019b1c10-0000-4000-8000-000000000102',
	office: '019b1c10-0000-4000-8000-000000000201',
	officeOther: '019b1c10-0000-4000-8000-000000000202',
	auth: '019b1c10-0000-4000-8000-000000000301',
	svc1: '019b1c10-0000-4000-8000-000000000401',
	svc2: '019b1c10-0000-4000-8000-000000000402',
} as const;

const mockStaff = (overrides?: Partial<StaffWithServiceTypes>): StaffWithServiceTypes => ({
	id: ids.staff,
	office_id: ids.office,
	name: 'スタッフA',
	role: 'admin',
	email: 'staff@example.com',
	note: null,
	auth_user_id: ids.auth,
	created_at: new Date('2025-12-22T00:00:00Z'),
	updated_at: new Date('2025-12-22T00:00:00Z'),
	service_type_ids: [ids.svc1],
	...overrides,
});

describe('StaffService', () => {
	let supabase: SupabaseClient<Database>;
	let staffRepository: StaffRepository;
	let service: StaffService;

	beforeEach(() => {
		supabase = buildSupabase();
		staffRepository = {
			findByAuthUserId: vi.fn().mockResolvedValue(mockStaff()),
			listByOffice: vi.fn().mockResolvedValue([mockStaff()]),
			findWithServiceTypesById: vi.fn().mockResolvedValue(mockStaff()),
			create: vi.fn().mockResolvedValue(mockStaff()),
			update: vi.fn().mockResolvedValue(mockStaff()),
			delete: vi.fn().mockResolvedValue(undefined),
		} as unknown as StaffRepository;
		service = new StaffService(supabase, staffRepository);
		vi.clearAllMocks();
	});

	describe('list', () => {
		it('管理者の事業所のスタッフ一覧を返す', async () => {
			const result = await service.list(ids.auth);
			expect(result).toHaveLength(1);
			expect(staffRepository.listByOffice).toHaveBeenCalledWith(ids.office);
		});

		it('管理者でない場合は403', async () => {
			(staffRepository.findByAuthUserId as any).mockResolvedValue(
				mockStaff({ role: 'helper', auth_user_id: ids.auth }),
			);
			await expect(service.list(ids.auth)).rejects.toThrow(ServiceError);
		});
	});

	describe('create', () => {
		const input: StaffInput = {
			name: '新規スタッフ',
			email: 'new@example.com',
			role: 'helper',
			note: 'メモ',
			service_type_ids: [ids.svc1],
		};

		it('バリデーションに成功すると作成', async () => {
			const inMock = vi.fn().mockResolvedValue({
				data: [{ id: ids.svc1 }],
				error: null,
			});
			const selectMock = vi.fn().mockReturnValue({ in: inMock });
			const fromMock = supabase.from as ReturnType<typeof vi.fn>;
			fromMock.mockReturnValue({
				select: selectMock,
			} as any);

			(staffRepository.create as any).mockResolvedValue(
				mockStaff({ service_type_ids: [ids.svc1] }),
			);

			const result = await service.create(ids.auth, input);
			expect(result.service_type_ids).toEqual([ids.svc1]);
			expect(staffRepository.create).toHaveBeenCalled();
		});

		it('サービス区分未指定の場合は全件を紐付ける', async () => {
			const defaultIds = [ids.svc1, ids.svc2];
			const selectAllMock = vi.fn().mockResolvedValue({
				data: defaultIds.map((id) => ({ id })),
				error: null,
			});
			const inMock = vi.fn().mockResolvedValue({
				data: defaultIds.map((id) => ({ id })),
				error: null,
			});
			const fromMock = supabase.from as ReturnType<typeof vi.fn>;
			fromMock.mockReturnValueOnce({ select: selectAllMock } as any).mockReturnValueOnce({
				select: () => ({ in: inMock }),
			} as any);

			(staffRepository.create as any).mockResolvedValue(
				mockStaff({ service_type_ids: defaultIds }),
			);

			const result = await service.create(ids.auth, { ...input, service_type_ids: [] });
			expect(result.service_type_ids).toEqual(defaultIds);
			expect(selectAllMock).toHaveBeenCalledWith('id');
			expect(inMock).toHaveBeenCalledWith('id', defaultIds);
		});
	});

	describe('update', () => {
		const input: StaffInput = {
			name: '更新スタッフ',
			email: 'update@example.com',
			role: 'helper',
			note: null,
			service_type_ids: [ids.svc2],
		};

		it('既存スタッフを更新できる', async () => {
			const inMock = vi.fn().mockResolvedValue({
				data: [{ id: ids.svc2 }],
				error: null,
			});
			const fromMock = supabase.from as ReturnType<typeof vi.fn>;
			fromMock.mockReturnValue({
				select: () => ({ in: inMock }),
			} as any);

			(staffRepository.findWithServiceTypesById as any).mockResolvedValue(
				mockStaff({
					id: ids.staffOther,
					service_type_ids: [ids.svc1],
				}),
			);
			(staffRepository.update as any).mockResolvedValue(
				mockStaff({ id: ids.staffOther, service_type_ids: [ids.svc2] }),
			);

			const result = await service.update(ids.auth, ids.staffOther, input);
			expect(result.service_type_ids).toEqual([ids.svc2]);
			expect(staffRepository.update).toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('事業所内のスタッフなら削除できる', async () => {
			await service.delete(ids.auth, ids.staff);
			expect(staffRepository.delete).toHaveBeenCalledWith(ids.staff);
		});

		it('他事業所のスタッフなら403', async () => {
			(staffRepository.findWithServiceTypesById as any).mockResolvedValue(
				mockStaff({ office_id: ids.officeOther, id: ids.staffOther }),
			);
			await expect(service.delete(ids.auth, ids.staffOther)).rejects.toThrow(ServiceError);
		});
	});
});
