import { z } from 'zod';

import type { Json } from '@/backend/types/supabase';
import { TimestampSchema } from '@/models/valueObjects/timestamp';

export const AiOperationLogSourceSchema = z.literal('ai_chat');

// Json (Supabase) は null を含むため、nullable() は不要
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

const NonNullJsonValueSchema = JsonValueSchema.refine(
	(v): v is Exclude<Json, null> => v !== null,
	{ message: 'targets must not be null' },
);

export const AiOperationLogSchema = z.object({
	id: z.uuid(),
	office_id: z.uuid(),
	actor_user_id: z.uuid(),
	source: AiOperationLogSourceSchema,
	operation_type: z.string().trim().min(1),
	targets: NonNullJsonValueSchema,
	proposal: JsonValueSchema.optional(),
	request: JsonValueSchema.optional(),
	result: JsonValueSchema.optional(),
	created_at: TimestampSchema,
});

export type AiOperationLog = z.infer<typeof AiOperationLogSchema>;

export const AiOperationLogInputSchema = z.object({
	office_id: z.uuid(),
	actor_user_id: z.uuid(),
	source: AiOperationLogSourceSchema,
	operation_type: z.string().trim().min(1),
	targets: NonNullJsonValueSchema,
	proposal: JsonValueSchema.optional(),
	request: JsonValueSchema.optional(),
	result: JsonValueSchema.optional(),
});

export type AiOperationLogInput = z.infer<typeof AiOperationLogInputSchema>;
