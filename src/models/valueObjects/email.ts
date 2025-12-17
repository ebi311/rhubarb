import { z } from 'zod';

export const EmailSchema = z.email({
	message: 'メールアドレスの形式が正しくありません',
});
export type Email = z.infer<typeof EmailSchema>;
