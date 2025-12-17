import { z } from 'zod';
import { TimestampSchema } from './valueObjects/timestamp';

export const ContractStatusSchema = z.enum(['active', 'suspended'], {
	message: "契約ステータスは'active'または'suspended'である必要があります",
});

export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ServiceUserSchema = z.object({
	id: z.uuid(),
	office_id: z.uuid(),
	name: z.string().min(1, { message: '氏名は必須です' }),
	address: z.string().min(1, { message: '住所は必須です' }),
	contract_status: ContractStatusSchema,
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});

export type ServiceUser = z.infer<typeof ServiceUserSchema>;

export const ServiceUserInputSchema = z.object({
	name: z
		.string()
		.min(1, '氏名は必須です')
		.max(100, '氏名は100文字以内で入力してください')
		.refine((val) => val.trim().length > 0, '氏名に空白のみは使用できません'),
	address: z
		.string()
		.min(1, '住所は必須です')
		.max(200, '住所は200文字以内で入力してください')
		.refine((val) => val.trim().length > 0, '住所に空白のみは使用できません'),
});

export type ServiceUserInput = z.infer<typeof ServiceUserInputSchema>;
