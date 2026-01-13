import { z } from 'zod';
import { StaffWithServiceTypesSchema, UserRoleSchema } from './staff';
import { EmailSchema } from './valueObjects/email';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';

const StaffNoteSchema = z
	.string()
	.max(500, { message: '備考は500文字以内で入力してください' })
	.nullable()
	.optional();

export const StaffInputSchema = z.object({
	name: z.string().min(1, { message: '氏名は必須です' }),
	email: EmailSchema.optional().nullable(),
	role: UserRoleSchema,
	note: StaffNoteSchema,
	service_type_ids: z.array(ServiceTypeIdSchema).min(0).optional(),
});

export type StaffInput = z.infer<typeof StaffInputSchema>;

export const StaffRecordSchema = StaffWithServiceTypesSchema;
export type StaffRecord = z.infer<typeof StaffRecordSchema>;
