import { z } from 'zod';

import type { Json } from '@/backend/types/supabase';
import { TimestampSchema } from '@/models/valueObjects/timestamp';

export const AiOperationLogSourceSchema = z.literal('ai_chat');

const JsonValueSchema: z.ZodType<Json> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema),
	]),
);

export const AiOperationLogSchema = z.object({
	id: z.uuid(),
	office_id: z.uuid(),
	actor_user_id: z.uuid(),
	source: AiOperationLogSourceSchema,
	operation_type: z.string().trim().min(1),
	targets: JsonValueSchema,
	proposal: JsonValueSchema.nullable().optional(),
	request: JsonValueSchema.nullable().optional(),
	result: JsonValueSchema.nullable().optional(),
	created_at: TimestampSchema,
});

export type AiOperationLog = z.infer<typeof AiOperationLogSchema>;

export const AiOperationLogInputSchema = z.object({
	office_id: z.uuid(),
	actor_user_id: z.uuid(),
	source: AiOperationLogSourceSchema,
	operation_type: z.string().trim().min(1),
	targets: JsonValueSchema,
	proposal: JsonValueSchema.nullable().optional(),
	request: JsonValueSchema.nullable().optional(),
	result: JsonValueSchema.nullable().optional(),
});

export type AiOperationLogInput = z.infer<typeof AiOperationLogInputSchema>;
