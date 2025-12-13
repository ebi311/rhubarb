import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'helper']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const StaffSchema = z.object({
  id: z.uuid(),
  office_id: z.uuid(),
  auth_user_id: z.uuid().nullable().optional(), // Supabase Auth との紐付け用
  name: z.string().min(1, { message: '氏名は必須です' }),
  role: UserRoleSchema,
  email: z.string().email().optional().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Staff = z.infer<typeof StaffSchema>;
