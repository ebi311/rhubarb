import { StaffRepository } from '@/backend/repositories/staffRepository';
import { createSupabaseClient } from '@/utils/supabase/server';
import { HeaderPresentational } from './HeaderPresentational';

export const Header = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	let userName: string = 'ゲスト';
	if (user) {
		const staffRepository = new StaffRepository(supabase);
		const staff = await staffRepository.findByAuthUserId(user.id);
		userName = staff?.name ?? user.email ?? 'ゲスト';
	}

	return <HeaderPresentational userName={userName} />;
};
