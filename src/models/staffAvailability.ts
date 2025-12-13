import { z } from 'zod';

export const DayOfWeekSchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const PrioritySchema = z.enum(['High', 'Low']);
export type Priority = z.infer<typeof PrioritySchema>;

export const StaffAvailabilitySchema = z.object({
  id: z.uuid(),
  staff_id: z.uuid(),
  day_of_week: DayOfWeekSchema,
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  priority: PrioritySchema.default('High'),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type StaffAvailability = z.infer<typeof StaffAvailabilitySchema>;
