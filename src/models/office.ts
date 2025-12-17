import { z } from 'zod';
import { TimestampSchema } from './valueObjects/timestamp';

export const OfficeSchema = z.object({
	id: z.uuid(),
	name: z.string().min(1, { message: '事業所名は必須です' }),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type Office = z.infer<typeof OfficeSchema>;
