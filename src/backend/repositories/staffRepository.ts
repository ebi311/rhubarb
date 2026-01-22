import { Database } from '@/backend/types/supabase';
import {
	Staff,
	StaffSchema,
	StaffWithServiceTypes,
	StaffWithServiceTypesSchema,
	UserRole,
} from '@/models/staff';
import { SupabaseClient } from '@supabase/supabase-js';

type StaffRow = Database['public']['Tables']['staffs']['Row'];
type StaffInsert = Database['public']['Tables']['staffs']['Insert'];
type StaffUpdate = Database['public']['Tables']['staffs']['Update'];
// type StaffAbilityRow = Database['public']['Tables']['staff_service_type_abilities']['Row'];

type StaffCreateParams = {
	office_id: string;
	name: string;
	role: UserRole;
	email?: string | null;
	note?: string | null;
	service_type_ids: string[];
};

type StaffUpdateParams = {
	name?: string;
	role?: UserRole;
	email?: string | null;
	note?: string | null;
	service_type_ids: string[];
};

export class StaffRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	private toDomain(row: StaffRow): Staff {
		return StaffSchema.parse({
			...row,
			created_at: new Date(row.created_at),
			updated_at: new Date(row.updated_at),
		});
	}

	private toDomainWithServiceTypes(
		row: StaffRow,
		serviceTypeIds: string[],
	): StaffWithServiceTypes {
		return StaffWithServiceTypesSchema.parse({
			...row,
			note: row.note ?? null,
			created_at: new Date(row.created_at),
			updated_at: new Date(row.updated_at),
			service_type_ids: serviceTypeIds,
		});
	}

	private async fetchServiceTypeMap(
		staffIds: string[],
	): Promise<Record<string, string[]>> {
		if (staffIds.length === 0) return {};
		const { data, error } = await this.supabase
			.from('staff_service_type_abilities')
			.select('staff_id, service_type_id')
			.in('staff_id', staffIds);
		if (error) throw error;
		const map: Record<string, string[]> = {};
		(data ?? []).forEach((row) => {
			if (!map[row.staff_id]) map[row.staff_id] = [];
			map[row.staff_id].push(row.service_type_id);
		});
		return map;
	}

	private async replaceServiceAbilities(
		staffId: string,
		serviceTypeIds: string[],
	): Promise<void> {
		const { error: deleteError } = await this.supabase
			.from('staff_service_type_abilities')
			.delete()
			.eq('staff_id', staffId);
		if (deleteError) throw deleteError;
		if (serviceTypeIds.length === 0) return;
		const rows = serviceTypeIds.map((serviceTypeId) => ({
			staff_id: staffId,
			service_type_id: serviceTypeId,
		}));
		const { error: insertError } = await this.supabase
			.from('staff_service_type_abilities')
			.insert(rows);
		if (insertError) throw insertError;
	}

	private buildUpdatePayload(input: StaffUpdateParams): StaffUpdate {
		const payload: StaffUpdate = {};
		if (typeof input.name !== 'undefined') payload.name = input.name;
		if (typeof input.role !== 'undefined') payload.role = input.role;
		if (typeof input.email !== 'undefined') payload.email = input.email ?? null;
		if (typeof input.note !== 'undefined') payload.note = input.note ?? null;
		return payload;
	}

	async listByOffice(officeId: string): Promise<StaffWithServiceTypes[]> {
		const { data, error } = await this.supabase
			.from('staffs')
			.select('*')
			.eq('office_id', officeId)
			.order('name', { ascending: true });
		if (error) throw error;
		const rows = data ?? [];
		const map = await this.fetchServiceTypeMap(rows.map((row) => row.id));
		return rows.map((row) =>
			this.toDomainWithServiceTypes(row, map[row.id] ?? []),
		);
	}

	async findById(id: string): Promise<Staff | null> {
		const { data, error } = await this.supabase
			.from('staffs')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return this.toDomain(data);
	}

	async findWithServiceTypesById(
		id: string,
	): Promise<StaffWithServiceTypes | null> {
		const { data, error } = await this.supabase
			.from('staffs')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		const map = await this.fetchServiceTypeMap([data.id]);
		return this.toDomainWithServiceTypes(data, map[data.id] ?? []);
	}

	async create(input: StaffCreateParams): Promise<StaffWithServiceTypes> {
		const payload: StaffInsert = {
			office_id: input.office_id,
			name: input.name,
			role: input.role,
			email: input.email ?? null,
			note: input.note ?? null,
		};
		const { data, error } = await this.supabase
			.from('staffs')
			.insert(payload)
			.select('*')
			.single();
		if (error || !data) throw error;
		await this.replaceServiceAbilities(data.id, input.service_type_ids);
		return this.toDomainWithServiceTypes(data, input.service_type_ids);
	}

	async update(
		id: string,
		input: StaffUpdateParams,
	): Promise<StaffWithServiceTypes> {
		const payload = this.buildUpdatePayload(input);
		let updatedRow: StaffRow | null = null;
		if (Object.keys(payload).length > 0) {
			const { data, error } = await this.supabase
				.from('staffs')
				.update(payload)
				.eq('id', id)
				.select('*')
				.single();
			if (error || !data) throw error;
			updatedRow = data;
		} else {
			const { data, error } = await this.supabase
				.from('staffs')
				.select('*')
				.eq('id', id)
				.single();
			if (error || !data) throw error;
			updatedRow = data;
		}
		if (!updatedRow) throw new Error('Staff not found');
		await this.replaceServiceAbilities(id, input.service_type_ids);
		return this.toDomainWithServiceTypes(updatedRow, input.service_type_ids);
	}

	async delete(id: string): Promise<void> {
		const { error } = await this.supabase.from('staffs').delete().eq('id', id);
		if (error) throw error;
	}

	async findByEmail(email: string): Promise<Staff | null> {
		// デバッグ用: 実行されるクエリの情報を出力
		console.log('=== findByEmail Debug ===');
		console.log('Looking for email:', email);
		console.log(
			'Supabase client auth state:',
			await this.supabase.auth.getUser(),
		);

		const { data, error, status } = await this.supabase
			.from('staffs')
			.select('*')
			.eq('email', email)
			.maybeSingle();

		console.log('findByEmail result:', {
			data,
			error: error
				? {
						message: error.message,
						details: error.details,
						hint: error.hint,
						code: error.code,
					}
				: null,
			status,
		});

		if (error) throw error;
		if (!data) return null;

		return this.toDomain(data);
	}

	async findByAuthUserId(authUserId: string): Promise<Staff | null> {
		const { data, error } = await this.supabase
			.from('staffs')
			.select('*')
			.eq('auth_user_id', authUserId)
			.maybeSingle();

		if (error) throw error;
		if (!data) return null;

		return this.toDomain(data);
	}

	async updateAuthUserId(id: string, authUserId: string): Promise<void> {
		const { error } = await this.supabase
			.from('staffs')
			.update({ auth_user_id: authUserId })
			.eq('id', id);

		if (error) throw error;
	}
}
