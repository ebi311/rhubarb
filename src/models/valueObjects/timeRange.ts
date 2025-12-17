import { z } from 'zod';
import { TimeValueSchema } from './time';

export const TimeRangeSchema = z
	.object({
		start: TimeValueSchema,
		end: TimeValueSchema,
	})
	.refine(
		(data) => {
			const start = data.start.hour * 60 + data.start.minute;
			const end = data.end.hour * 60 + data.end.minute;
			return start < end;
		},
		{
			message: '開始時間は終了時間より前である必要があります',
			path: ['end'],
		},
	);

export type TimeRange = z.infer<typeof TimeRangeSchema>;
