import { z } from "zod";
import { EmailSchema } from "./valueObjects/email";
import { TimestampSchema } from "./valueObjects/timestamp";

export const UserRoleSchema = z.enum(["admin", "helper"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const StaffSchema = z.object({
  id: z.uuid(),
  office_id: z.uuid(),
  auth_user_id: z.uuid().nullable().optional(), // Supabase Auth との紐付け用
  name: z.string().min(1, { message: "氏名は必須です" }),
  role: UserRoleSchema,
  email: EmailSchema.optional().nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export type Staff = z.infer<typeof StaffSchema>;
