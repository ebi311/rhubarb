import { Database } from '@/backend/types/supabase';
import {
	ServiceUser,
	ServiceUserInput,
	ServiceUserSchema,
} from '@/models/serviceUser';
import { SupabaseClient } from '@supabase/supabase-js';

// DBテーブル名は既存の clients を利用
// naming 衝突を避けるためドメイン側は ServiceUser として扱う

type ServiceUserRow = Database['public']['Tables']['clients']['Row'];
type ServiceUserInsert = Database['public']['Tables']['clients']['Insert'];
type ServiceUserUpdate = Database['public']['Tables']['clients']['Update'];

export class ServiceUserRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	private toDomain(row: ServiceUserRow): ServiceUser {
		return ServiceUserSchema.parse({
			...row,
			created_at: new Date(row.created_at),
			updated_at: new Date(row.updated_at),
		});
	}

	async findAll(
		officeId: string,
		status: 'active' | 'suspended' | 'all' = 'active',
	): Promise<ServiceUser[]> {
		let query = this.supabase
			.from('clients')
			.select('*')
			.eq('office_id', officeId)
			.order('name', { ascending: true });

		if (status !== 'all') {
			query = query.eq('contract_status', status);
		}

		const { data, error } = await query;

		if (error) throw error;
		if (!data) return [];

		return data.map((row) => this.toDomain(row));
	}

	async findById(id: string): Promise<ServiceUser | null> {
		const { data, error } = await this.supabase
			.from('clients')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) throw error;
		if (!data) return null;

		return this.toDomain(data);
	}

	// 空文字列を null に正規化
	private normalizeAddress(address: string | null | undefined): string | null {
		if (address === undefined || address === null || address.trim() === '') {
			return null;
		}
		return address;
	}

	async create(data: {
		office_id: string;
		name: string;
		address?: string | null;
	}): Promise<ServiceUser> {
		const insertData: ServiceUserInsert = {
			office_id: data.office_id,
			name: data.name,
			address: this.normalizeAddress(data.address),
			contract_status: 'active',
		};

		const { data: created, error } = await this.supabase
			.from('clients')
			.insert(insertData)
			.select()
			.single();

		if (error) throw error;
		if (!created) throw new Error('Failed to create service user');

		return this.toDomain(created);
	}

	async update(id: string, data: ServiceUserInput): Promise<ServiceUser> {
		const updateData: ServiceUserUpdate = {
			name: data.name,
			address: this.normalizeAddress(data.address),
		};

		const { data: updated, error } = await this.supabase
			.from('clients')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		if (!updated) throw new Error('Service user not found');

		return this.toDomain(updated);
	}

	async suspend(id: string): Promise<ServiceUser> {
		const { data: updated, error } = await this.supabase
			.from('clients')
			.update({ contract_status: 'suspended' })
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		if (!updated) throw new Error('Service user not found');

		return this.toDomain(updated);
	}

	async resume(id: string): Promise<ServiceUser> {
		const { data: updated, error } = await this.supabase
			.from('clients')
			.update({ contract_status: 'active' })
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		if (!updated) throw new Error('Service user not found');

		return this.toDomain(updated);
	}

	async findActiveServiceUsers(officeId: string): Promise<ServiceUser[]> {
		return this.findAll(officeId, 'active');
	}
}
