import { z } from 'zod';
import { DayOfWeekSchema } from './staffAvailability';

export const BasicScheduleSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  service_type_id: z.uuid(),
  staff_id: z.uuid().nullable().optional(), // 担当者が決まっていない場合もあり得るか？要件的には「基本スケジュール」なので決まっていることが多いが、未定もありうるなら nullable。一旦 nullable にしておく。
  day_of_week: DayOfWeekSchema,
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'HH:mm形式で入力してください' }),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type BasicSchedule = z.infer<typeof BasicScheduleSchema>;
