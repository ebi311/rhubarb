import { z } from 'zod';

export const dayOfWeekValues = [
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
	'Sun',
] as const;
export const DayOfWeekSchema = z.enum(dayOfWeekValues);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;
