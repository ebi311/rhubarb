import { createSupabaseClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { UserMenu } from './UserMenu';

export async function Header() {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const userName = user?.user_metadata?.name || user?.email || 'ゲスト';

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
}
