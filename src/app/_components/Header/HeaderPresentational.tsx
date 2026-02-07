'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useContext } from 'react';
import { pageContext } from './context';
import { NavigationMenu } from './NavigationMenu';
import { UserMenu } from './UserMenu';

type Props = {
	userName: string;
};
export const HeaderPresentational = ({ userName }: Props) => {
	const { title } = useContext(pageContext);
	return (
		<header className="navbar bg-base-100 shadow-sm">
			<div className="flex flex-1 items-end gap-4">
				<Link
					href="/"
					className="btn h-auto text-xl btn-ghost"
					aria-label="Rhubarb"
				>
					<Image
						src="/rhubarb-logo-light.png"
						alt="Rhubarb"
						width={120}
						height={40}
						className="block dark:hidden"
					/>
					<Image
						src="/rhubarb-logo-dark.png"
						alt="Rhubarb"
						width={120}
						height={40}
						className="hidden dark:block"
					/>
				</Link>
				<h1 className="text-xl font-bold">{title}</h1>
			</div>
			<div className="flex-none">
				<NavigationMenu />
				<UserMenu userName={userName} />
			</div>
		</header>
	);
};
