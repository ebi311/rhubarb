'use client';

import { signOutAction } from '@/app/actions/auth';

type Props = {
	userName: string;
};

export const UserMenu = ({ userName }: Props) => {
	return (
		<div className="dropdown dropdown-end">
			<div tabIndex={0} role="button" className="btn btn-ghost">
				{userName}
			</div>
			<ul
				tabIndex={0}
				className="dropdown-content menu z-10 w-52 rounded-box bg-base-100 p-2 shadow"
			>
				<li>
					<button onClick={() => signOutAction()}>ログアウト</button>
				</li>
			</ul>
		</div>
	);
};
