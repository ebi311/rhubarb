import { signOut } from '@/app/auth/actions';

type Props = {
	userName: string;
};

export const UserMenu = ({ userName }: Props) => {
	return (
		<details className="dropdown dropdown-end">
			<summary className="btn btn-ghost">{userName}</summary>
			<ul className="dropdown-content menu z-10 w-52 rounded-box bg-base-100 p-2 shadow">
				<li>
					<form action={signOut}>
						<button type="submit">ログアウト</button>
					</form>
				</li>
			</ul>
		</details>
	);
};
