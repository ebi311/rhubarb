import { z } from 'zod';

import type { Json } from '@/backend/types/supabase';
import { AiChatMutationProposalTypeSchema } from '@/models/aiChatMutationProposal';
import { TimestampSchema } from '@/models/valueObjects/timestamp';

export const AiOperationLogSourceSchema = z.literal('ai_chat');

export const AiOperationTypeSchema = AiChatMutationProposalTypeSchema;

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
	(value): value is Exclude<Json, null> => value !== null,
	{ message: 'targets は null にできません' },
);

const TargetsSchema = NonNullJsonValueSchema.refine(
	(value): value is Record<string, Json> =>
		typeof value === 'object' && !Array.isArray(value),
	{ message: 'targets は JSON オブジェクトである必要があります' },
);

export const AiOperationLogSchema = z.object({
	id: z.uuid(),
	office_id: z.uuid(),
	actor_user_id: z.uuid(),
	source: AiOperationLogSourceSchema,
	operation_type: AiOperationTypeSchema,
	targets: TargetsSchema,
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
	operation_type: AiOperationTypeSchema,
	targets: TargetsSchema,
	proposal: JsonValueSchema.optional(),
	request: JsonValueSchema.optional(),
	result: JsonValueSchema.optional(),
});

export type AiOperationLogInput = z.infer<typeof AiOperationLogInputSchema>;
