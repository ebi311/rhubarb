import { z } from 'zod';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeRangeSchema } from './valueObjects/timeRange';
import { TimestampSchema } from './valueObjects/timestamp';

export const ShiftStatusSchema = z.enum([
	'scheduled',
	'confirmed',
	'completed',
	'canceled',
]);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ShiftSchema = z.object({
	id: z.uuid(),
	client_id: z.uuid(),
	service_type_id: ServiceTypeIdSchema,
	staff_id: z.uuid().nullable().optional(),
	date: z.coerce.date(), // YYYY-MM-DD
	time: TimeRangeSchema,
	status: ShiftStatusSchema.default('scheduled'),
	is_unassigned: z.boolean().default(false),
	canceled_reason: z.string().nullable().optional(),
	canceled_category: z.string().nullable().optional(),
	canceled_at: TimestampSchema.nullable().optional(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type Shift = z.infer<typeof ShiftSchema>;
