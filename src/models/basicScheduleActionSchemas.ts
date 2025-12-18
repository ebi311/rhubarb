import { z } from 'zod';
import { TimeValueSchema } from './valueObjects/time';
import { TimeRangeSchema } from './valueObjects/timeRange';
import { TimestampSchema } from './valueObjects/timestamp';

export const WeekdaySchema = z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
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
		client_id: z.string().uuid({ message: 'client_id は UUID 形式で指定してください' }),
		service_type_id: z.string().uuid({ message: 'service_type_id は UUID 形式で指定してください' }),
		staff_id: z.string().uuid({ message: 'staff_id は UUID 形式で指定してください' }),
		weekday: WeekdaySchema,
		start_time: TimeValueSchema,
		end_time: TimeValueSchema,
		note: z.string().max(500).optional(),
	}),
);
export type BasicScheduleInput = z.infer<typeof BasicScheduleInputSchema>;

export const BasicScheduleFilterSchema = z.object({
	weekday: WeekdaySchema.optional(),
	client_id: z.string().uuid().optional(),
	service_type_id: z.string().uuid().optional(),
	includeDeleted: z.boolean().default(false),
});
export type BasicScheduleFilters = z.infer<typeof BasicScheduleFilterSchema>;

export const BasicScheduleRecordSchema = withTimeRangeValidation(
	z.object({
		id: z.string().uuid(),
		client_id: z.string().uuid(),
		service_type_id: z.string().uuid(),
		staff_id: z.string().uuid().nullable(),
		weekday: WeekdaySchema,
		start_time: TimeValueSchema,
		end_time: TimeValueSchema,
		note: z.string().nullable().optional(),
		deleted_at: TimestampSchema.nullable().optional(),
		created_at: TimestampSchema,
		updated_at: TimestampSchema,
	}),
);
export type BasicScheduleRecord = z.infer<typeof BasicScheduleRecordSchema>;
