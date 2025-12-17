import { ServiceUserRepository } from '@/backend/repositories/serviceUserRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import {
	ServiceUserInputSchema,
	type ServiceUser,
	type ServiceUserInput,
} from '@/models/serviceUser';
import { SupabaseClient } from '@supabase/supabase-js';

export class ServiceError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

export type ServiceUserStatusFilter = 'active' | 'suspended' | 'all';

export class ServiceUserService {
	private serviceUserRepository: ServiceUserRepository;
	private staffRepository: StaffRepository;

	constructor(private supabase: SupabaseClient<Database>) {
		this.serviceUserRepository = new ServiceUserRepository(supabase);
		this.staffRepository = new StaffRepository(supabase);
	}

	private async getStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		return staff;
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.getStaff(userId);
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	async getServiceUsers(
		userId: string,
		status: ServiceUserStatusFilter = 'active',
	): Promise<ServiceUser[]> {
		const staff = await this.getStaff(userId);
		if (!['active', 'suspended', 'all'].includes(status)) {
			throw new ServiceError(400, 'Invalid status parameter');
		}
		return this.serviceUserRepository.findAll(staff.office_id, status);
	}

	async createServiceUser(userId: string, input: ServiceUserInput): Promise<ServiceUser> {
		const staff = await this.getAdminStaff(userId);
		const validation = ServiceUserInputSchema.safeParse(input);
		if (!validation.success) {
			throw new ServiceError(400, 'Validation error', validation.error.issues);
		}

		return this.serviceUserRepository.create({
			office_id: staff.office_id,
			name: validation.data.name,
			address: validation.data.address,
		});
	}

	async updateServiceUser(
		userId: string,
		id: string,
		input: ServiceUserInput,
	): Promise<ServiceUser> {
		const staff = await this.getAdminStaff(userId);
		const existing = await this.serviceUserRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Service user not found');
		if (existing.office_id !== staff.office_id) throw new ServiceError(403, 'Forbidden');

		const validation = ServiceUserInputSchema.safeParse(input);
		if (!validation.success) {
			throw new ServiceError(400, 'Validation error', validation.error.issues);
		}

		return this.serviceUserRepository.update(id, validation.data);
	}

	async suspendServiceUser(userId: string, id: string): Promise<ServiceUser> {
		const staff = await this.getAdminStaff(userId);
		const existing = await this.serviceUserRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Service user not found');
		if (existing.office_id !== staff.office_id) throw new ServiceError(403, 'Forbidden');

		return this.serviceUserRepository.suspend(id);
	}

	async resumeServiceUser(userId: string, id: string): Promise<ServiceUser> {
		const staff = await this.getAdminStaff(userId);
		const existing = await this.serviceUserRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Service user not found');
		if (existing.office_id !== staff.office_id) throw new ServiceError(403, 'Forbidden');

		return this.serviceUserRepository.resume(id);
	}
}
