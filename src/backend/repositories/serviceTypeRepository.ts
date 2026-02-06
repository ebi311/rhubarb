import { SupabaseClient } from '@supabase/supabase-js';

export type ServiceType = {
	id: string;
	name: string;
};

export class ServiceTypeRepository {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * 全サービス種別を取得
	 */
	async findAll(): Promise<ServiceType[]> {
		const { data, error } = await this.supabase
			.from('service_types')
			.select('id, name');

		if (error) {
			throw error;
		}

		return data ?? [];
	}
}
