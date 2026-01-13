import { z } from 'zod';
import { DayOfWeekSchema } from './valueObjects/dayOfWeek';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeRangeSchema } from './valueObjects/timeRange';
import { TimestampSchema } from './valueObjects/timestamp';

export const BasicScheduleSchema = z.object({
	id: z.uuid(),
	client_id: z.uuid(),
	service_type_id: ServiceTypeIdSchema,
	day_of_week: DayOfWeekSchema,
	time: TimeRangeSchema,
	note: z.string().max(500).nullable().optional(),
	deleted_at: TimestampSchema.nullable().optional(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type BasicSchedule = z.infer<typeof BasicScheduleSchema>;

export const BasicScheduleWithStaffSchema = BasicScheduleSchema.extend({
	staff_ids: z.array(z.uuid()),
});

export type BasicScheduleWithStaff = z.infer<typeof BasicScheduleWithStaffSchema>;
