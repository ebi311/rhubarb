import { z } from 'zod';
import { DayOfWeekSchema } from './valueObjects/dayOfWeek';
import { TimeValueSchema } from './valueObjects/time';
import { TimeRangeSchema } from './valueObjects/timeRange';
import { TimestampSchema } from './valueObjects/timestamp';

export const WeekdaySchema = DayOfWeekSchema;
export type Weekday = z.infer<typeof WeekdaySchema>;

const withTimeRangeValidation = <T extends { start_time: unknown; end_time: unknown }>(
	schema: z.ZodType<T>,
) =>
	schema.superRefine((val, ctx) => {
		const parsed = TimeRangeSchema.safeParse({ start: val.start_time, end: val.end_time });
		if (!parsed.success) {
			parsed.error.issues.forEach((issue) => {
				const mappedPath = issue.path.map((p) =>
					p === 'start' ? 'start_time' : p === 'end' ? 'end_time' : p,
				);
				ctx.addIssue({ ...issue, path: mappedPath });
			});
		}
	});

export const BasicScheduleInputSchema = withTimeRangeValidation(
	z.object({
		client_id: z.uuid({ message: 'client_id は UUID 形式で指定してください' }),
		service_type_id: z.uuid({ message: 'service_type_id は UUID 形式で指定してください' }),
		staff_ids: z.array(z.uuid({ message: 'staff_id は UUID 形式で指定してください' })).min(0),
		weekday: WeekdaySchema,
		start_time: TimeValueSchema,
		end_time: TimeValueSchema,
	}),
);
export type BasicScheduleInput = z.infer<typeof BasicScheduleInputSchema>;

export const BasicScheduleFilterSchema = z.object({
	weekday: WeekdaySchema.optional(),
	client_id: z.uuid().optional(),
	service_type_id: z.uuid().optional(),
	includeDeleted: z.boolean(),
});
export type BasicScheduleFilters = z.infer<typeof BasicScheduleFilterSchema>;

export const BasicScheduleRecordSchema = withTimeRangeValidation(
	z.object({
		id: z.uuid(),
		client_id: z.uuid(),
		service_type_id: z.uuid(),
		staff_ids: z.array(z.uuid()),
		weekday: WeekdaySchema,
		start_time: TimeValueSchema,
		end_time: TimeValueSchema,
		deleted_at: TimestampSchema.nullable().optional(),
		created_at: TimestampSchema,
		updated_at: TimestampSchema,
	}),
);

export type BasicScheduleRecord = z.infer<typeof BasicScheduleRecordSchema>;
