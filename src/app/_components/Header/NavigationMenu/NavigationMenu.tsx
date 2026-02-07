'use client';

import { Icon } from '@/app/_components/Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

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
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const pathname = usePathname();

	// パス変更時にメニューを閉じる
	useEffect(() => {
		if (detailsRef.current) {
			detailsRef.current.open = false;
		}
	}, [pathname]);

	const closeMenu = () => {
		if (detailsRef.current) {
			detailsRef.current.open = false;
		}
	};

	return (
		<details ref={detailsRef} className="dropdown dropdown-end">
			<summary className="btn btn-ghost">
				<Icon name="menu" />
				メニュー
			</summary>
			<ul className="dropdown-content menu z-10 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow">
				{MENU_ITEMS.map((group, groupIndex) => (
					<React.Fragment key={`group-${groupIndex}`}>
						{groupIndex > 0 && <li></li>}
						{group.map((item) => (
							<li key={item.href}>
								<Link href={item.href} onClick={closeMenu}>
									{item.label}
								</Link>
							</li>
						))}
					</React.Fragment>
				))}
			</ul>
		</details>
	);
};
