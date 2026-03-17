import { AiOperationLogRepository } from '@/backend/repositories/aiOperationLogRepository';
import { ServiceError } from '@/backend/services/basicScheduleService';
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
		const parsed = AiOperationLogInputSchema.safeParse({
			...input,
			source: 'ai_chat',
		});
		if (!parsed.success) {
			throw new ServiceError(400, 'Validation error', parsed.error.issues);
		}

		return this.repository.create(parsed.data);
	}

	async logSilently(input: AiOperationLogServiceInput): Promise<void> {
		try {
			await this.log(input);
		} catch (error) {
			console.error('Failed to write ai operation log', error);
		}
	}
}
