import { DayOfWeekSchema } from '@/models/valueObjects/dayOfWeek';
import z from 'zod';

export const BasicScheduleFilterSchema = z.object({
	weekday: DayOfWeekSchema.or(z.literal('')).optional(),
	clientId: z.uuid().or(z.literal('')).optional(),
	serviceTypeId: z.uuid().or(z.literal('')).optional(),
});

export type BasicScheduleFilterState = z.infer<typeof BasicScheduleFilterSchema>;

export interface ClientOption {
	id: string;
	name: string;
}

export interface ServiceTypeOption {
	id: string;
	name: string;
}
