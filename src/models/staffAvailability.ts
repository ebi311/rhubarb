import { z } from "zod";
import { TimeRangeSchema } from "./valueObjects/timeRange";

export const DayOfWeekSchema = z.enum([
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const PrioritySchema = z.enum(["High", "Low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const StaffAvailabilitySchema = z.object({
  id: z.uuid(),
  staff_id: z.uuid(),
  day_of_week: DayOfWeekSchema,
  time: TimeRangeSchema,
  priority: PrioritySchema.default("High"),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type StaffAvailability = z.infer<typeof StaffAvailabilitySchema>;
