import { z } from "zod";
import { TimeRangeSchema } from "./valueObjects/timeRange";
import { DayOfWeekSchema } from "./valueObjects/dayOfWeek";
import { TimestampSchema } from "./valueObjects/timestamp";

export const PrioritySchema = z.enum(["High", "Low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const StaffAvailabilitySchema = z.object({
  id: z.uuid(),
  staff_id: z.uuid(),
  day_of_week: DayOfWeekSchema,
  time: TimeRangeSchema,
  priority: PrioritySchema.default("High"),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export type StaffAvailability = z.infer<typeof StaffAvailabilitySchema>;
