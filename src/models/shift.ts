import { z } from 'zod';

export const ShiftStatusSchema = z.enum(['scheduled', 'confirmed', 'completed', 'canceled']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ShiftSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  service_type_id: z.uuid(),
  staff_id: z.uuid().nullable().optional(),
  date: z.coerce.date(), // YYYY-MM-DD
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  status: ShiftStatusSchema.default('scheduled'),
  is_unassigned: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Shift = z.infer<typeof ShiftSchema>;
