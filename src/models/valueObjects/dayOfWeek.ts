import { z } from 'zod';

export const DayOfWeekSchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;
