import { z } from "zod";
import { TimestampSchema } from "./valueObjects/timestamp";

export const ClientSchema = z.object({
  id: z.uuid(),
  office_id: z.uuid(),
  name: z.string().min(1, { message: "氏名は必須です" }),
  address: z.string().min(1, { message: "住所は必須です" }),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export type Client = z.infer<typeof ClientSchema>;
