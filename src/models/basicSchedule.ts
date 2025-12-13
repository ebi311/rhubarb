import { z } from "zod";
import { DayOfWeekSchema } from "./staffAvailability";
import { rhubarbTime } from "./time";

export const BasicScheduleSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  service_type_id: z.uuid(),
  staff_id: z.uuid().nullable().optional(), // 担当者が決まっていない場合もあり得るか？要件的には「基本スケジュール」なので決まっていることが多いが、未定もありうるなら nullable。一旦 nullable にしておく。
  day_of_week: DayOfWeekSchema,
  start_time: rhubarbTime(),
  end_time: rhubarbTime(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type BasicSchedule = z.infer<typeof BasicScheduleSchema>;
