import { z } from 'zod';
import { TimestampSchema } from './valueObjects/timestamp';

export const ServiceTypeSchema = z.object({
	id: z.uuid(),
	office_id: z.uuid(),
	name: z.string().min(1, { message: 'サービス種別名は必須です' }),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type ServiceType = z.infer<typeof ServiceTypeSchema>;
