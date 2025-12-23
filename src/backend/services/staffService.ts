import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import type { StaffWithServiceTypes } from '@/models/staff';
import {
	StaffInput,
	StaffInputSchema,
	StaffRecord,
	StaffRecordSchema,
} from '@/models/staffActionSchemas';
import { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError } from './basicScheduleService';

type StaffRepositoryType = Pick<
	StaffRepository,
	'findByAuthUserId' | 'listByOffice' | 'findWithServiceTypesById' | 'create' | 'update' | 'delete'
>;

export class StaffService {
	private staffRepository: StaffRepositoryType;

	constructor(
		private supabase: SupabaseClient<Database>,
		repo?: StaffRepositoryType,
	) {
		this.staffRepository = repo ?? new StaffRepository(supabase);
	}

	private normalizeNote(note?: string | null): string | null | undefined {
		if (typeof note === 'undefined') return undefined;
		const trimmed = note?.trim();
		return trimmed ? trimmed : null;
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	private async assertServiceTypesBelongToOffice(serviceTypeIds: string[], officeId: string) {
		if (serviceTypeIds.length === 0) return;
		const { data, error } = await this.supabase
			.from('service_types')
			.select('id, office_id')
			.in('id', serviceTypeIds)
			.eq('office_id', officeId);
		if (error) throw error;
		if ((data ?? []).length !== serviceTypeIds.length)
			throw new ServiceError(400, 'Service type does not belong to office');
	}

	private async findOfficeServiceTypeIds(officeId: string): Promise<string[]> {
		const { data, error } = await this.supabase
			.from('service_types')
			.select('id')
			.eq('office_id', officeId);
		if (error) throw error;
		return (data ?? []).map((row) => row.id);
	}

	private toRecord(staff: StaffWithServiceTypes): StaffRecord {
		return StaffRecordSchema.parse(staff);
	}

	async list(userId: string): Promise<StaffRecord[]> {
		const admin = await this.getAdminStaff(userId);
		const staffs = await this.staffRepository.listByOffice(admin.office_id);
		return staffs.map((staff) => this.toRecord(staff));
	}

	async get(userId: string, id: string): Promise<StaffRecord> {
		const admin = await this.getAdminStaff(userId);
		const staff = await this.staffRepository.findWithServiceTypesById(id);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.office_id !== admin.office_id) throw new ServiceError(403, 'Forbidden');
		return this.toRecord(staff);
	}

	async create(userId: string, input: StaffInput): Promise<StaffRecord> {
		const admin = await this.getAdminStaff(userId);
		const parsed = StaffInputSchema.safeParse(input);
		if (!parsed.success) throw new ServiceError(400, 'Validation error', parsed.error.issues);
		const data = parsed.data;
		const serviceTypeIds = data.service_type_ids?.length
			? data.service_type_ids
			: await this.findOfficeServiceTypeIds(admin.office_id);
		await this.assertServiceTypesBelongToOffice(serviceTypeIds, admin.office_id);
		const staff = await this.staffRepository.create({
			office_id: admin.office_id,
			name: data.name,
			role: data.role,
			email: data.email ?? null,
			note: this.normalizeNote(data.note),
			service_type_ids: serviceTypeIds,
		});
		return this.toRecord(staff);
	}

	async update(userId: string, id: string, input: StaffInput): Promise<StaffRecord> {
		const admin = await this.getAdminStaff(userId);
		const existing = await this.staffRepository.findWithServiceTypesById(id);
		if (!existing) throw new ServiceError(404, 'Staff not found');
		if (existing.office_id !== admin.office_id) throw new ServiceError(403, 'Forbidden');
		const parsed = StaffInputSchema.safeParse(input);
		if (!parsed.success) throw new ServiceError(400, 'Validation error', parsed.error.issues);
		const data = parsed.data;
		const serviceTypeIds = data.service_type_ids?.length
			? data.service_type_ids
			: existing.service_type_ids.length > 0
				? existing.service_type_ids
				: await this.findOfficeServiceTypeIds(admin.office_id);
		await this.assertServiceTypesBelongToOffice(serviceTypeIds, admin.office_id);
		const staff = await this.staffRepository.update(id, {
			name: data.name,
			role: data.role,
			email: data.email ?? null,
			note: this.normalizeNote(data.note),
			service_type_ids: serviceTypeIds,
		});
		return this.toRecord(staff);
	}

	async delete(userId: string, id: string): Promise<void> {
		const admin = await this.getAdminStaff(userId);
		const staff = await this.staffRepository.findWithServiceTypesById(id);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.office_id !== admin.office_id) throw new ServiceError(403, 'Forbidden');
		await this.staffRepository.delete(id);
	}
}
