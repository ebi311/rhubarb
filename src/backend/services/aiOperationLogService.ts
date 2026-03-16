import { AiOperationLogRepository } from '@/backend/repositories/aiOperationLogRepository';
import {
	AiOperationLog,
	AiOperationLogInput,
	AiOperationLogInputSchema,
} from '@/models/aiOperationLog';
import { createAdminClient } from '@/utils/supabase/admin';

export type AiOperationLogServiceInput = Omit<AiOperationLogInput, 'source'>;

interface AiOperationLogServiceOptions {
	repository?: AiOperationLogRepository;
}

export class AiOperationLogService {
	private repository: AiOperationLogRepository;

	constructor(options: AiOperationLogServiceOptions = {}) {
		this.repository =
			options.repository ?? new AiOperationLogRepository(createAdminClient());
	}

	async log(input: AiOperationLogServiceInput): Promise<AiOperationLog> {
		const payload = AiOperationLogInputSchema.parse({
			...input,
			source: 'ai_chat',
		});

		return this.repository.create(payload);
	}

	async logSilently(input: AiOperationLogServiceInput): Promise<void> {
		try {
			await this.log(input);
		} catch (error) {
			console.error('Failed to write ai operation log', error);
		}
	}
}
