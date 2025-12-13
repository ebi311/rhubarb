import { z } from 'zod';

export const ClientStaffAssignmentSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  staff_id: z.uuid(),
  service_type_id: z.uuid(),
  note: z.string().optional().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type ClientStaffAssignment = z.infer<typeof ClientStaffAssignmentSchema>;
