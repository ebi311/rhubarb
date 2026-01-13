import { z } from 'zod';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimestampSchema } from './valueObjects/timestamp';

export const ServiceTypeSchema = z.object({
	id: ServiceTypeIdSchema,
	name: z.string().min(1, { message: 'サービス種別名は必須です' }),
	display_order: z.number().int(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type ServiceType = z.infer<typeof ServiceTypeSchema>;
