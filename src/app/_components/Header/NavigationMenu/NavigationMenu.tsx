import { Icon } from '@/app/_components/Icon';
import Link from 'next/link';

type MenuItem = {
	label: string;
	href: string;
};

type MenuGroup = MenuItem[];

const MENU_ITEMS: MenuGroup[] = [
	[
		{ label: 'ダッシュボード', href: '/' },
		{ label: '週次スケジュール', href: '/admin/weekly-schedules' },
		{ label: '基本スケジュール', href: '/admin/basic-schedules' },
	],
	[
		{ label: '利用者管理', href: '/admin/clients' },
		{ label: 'スタッフ管理', href: '/admin/staffs' },
	],
];

export const NavigationMenu = () => {
	return (
		<details className="dropdown dropdown-end">
			<summary className="btn btn-ghost">
				<Icon name="menu" />
				メニュー
			</summary>
			<ul className="dropdown-content menu z-10 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow">
				{MENU_ITEMS.map((group, groupIndex) => (
					<li key={`group-${groupIndex}`}>
						<ul>
							{group.map((item) => (
								<li key={item.href}>
									<Link href={item.href}>{item.label}</Link>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</details>
	);
};
