import { StaffRepository } from '@/backend/repositories/staffRepository';
import { createSupabaseClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { UserMenu } from './UserMenu';

type HeaderPresentationalProps = {
	userName: string;
};

export const HeaderPresentational = ({
	userName,
}: HeaderPresentationalProps) => {
	return (
		<header className="navbar bg-base-100 shadow-sm">
			<div className="flex-1">
				<Link href="/" className="btn text-xl btn-ghost">
					Rhubarb
				</Link>
			</div>
			<div className="flex-none">
				<UserMenu userName={userName} />
			</div>
		</header>
	);
};

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
