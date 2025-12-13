import { z } from "zod";
import { TimeRangeSchema } from "./valueObjects/timeRange";

export const ShiftStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "canceled",
]);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ShiftSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  service_type_id: z.uuid(),
  staff_id: z.uuid().nullable().optional(),
  date: z.coerce.date(), // YYYY-MM-DD
  time: TimeRangeSchema,
  status: ShiftStatusSchema.default("scheduled"),
  is_unassigned: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Shift = z.infer<typeof ShiftSchema>;
