import { Database } from '@/backend/types/supabase';
import {
	AiOperationLog,
	AiOperationLogInput,
	AiOperationLogSchema,
} from '@/models/aiOperationLog';
import { SupabaseClient } from '@supabase/supabase-js';

export class AiOperationLogRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	async create(input: AiOperationLogInput): Promise<AiOperationLog> {
		const { data, error } = await this.supabase
			.from('ai_operation_logs')
			.insert(input)
			.select()
			.single();

		if (error) throw error;
		if (!data) throw new Error('Failed to create ai operation log');

		return AiOperationLogSchema.parse(data);
	}
}
