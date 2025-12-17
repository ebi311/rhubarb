import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { createAdminClient } from '@/utils/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';

export class AuthService {
	private staffRepository: StaffRepository;

	constructor(private supabase: SupabaseClient<Database>) {
		// ログイン処理ではRLSをバイパスする必要があるため、Admin Clientを使用
		const adminClient = createAdminClient();
		this.staffRepository = new StaffRepository(adminClient);
	}

	/**
	 * ログイン後のユーザー処理
	 * メールアドレスでスタッフを検索し、存在すればauth_user_idを紐付ける
	 * @param email ユーザーのメールアドレス
	 * @param authUserId Supabase AuthのユーザーID
	 * @returns スタッフが存在し、処理が成功した場合はtrue、それ以外はfalse
	 */
	async handlePostLogin(email: string, authUserId: string): Promise<boolean> {
		const staff = await this.staffRepository.findByEmail(email);

		if (!staff) {
			return false;
		}

		// auth_user_idが未設定の場合のみ更新
		if (!staff.auth_user_id) {
			await this.staffRepository.updateAuthUserId(staff.id, authUserId);
		}

		return true;
	}
}
