import { z } from 'zod';
import { TimestampSchema } from './valueObjects/timestamp';

export const ClientStaffAssignmentSchema = z.object({
	id: z.uuid(),
	client_id: z.uuid(),
	staff_id: z.uuid(),
	service_type_id: z.uuid(),
	note: z.string().optional().nullable(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type ClientStaffAssignment = z.infer<typeof ClientStaffAssignmentSchema>;
