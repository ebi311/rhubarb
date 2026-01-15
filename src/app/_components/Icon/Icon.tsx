import classNames from 'classnames';
import React from 'react';

export const ICON_NAMES = [
	'account_circle',
	'add_task',
	'add',
	'calendar_month',
	'calendar_today',
	'calendar_view_week',
	'check_circle',
	'check',
	'close',
	'delete',
	'edit',
	'home',
	'info',
	'menu',
	'schedule',
	'search',
	'settings',
	'task_alt',
	'task',
	'view_week',
	'warning',
] as const;

type Props = {
	name: (typeof ICON_NAMES)[number];
	fill?: boolean;
	className?: string;
};

export const Icon: React.FC<Props> = ({ name, fill = false, className }) => {
	const iconClassName = classNames(
		'material-symbols-rounded',
		{
			'icon-filled': fill,
		},
		className,
	);
	return <span className={iconClassName}>{name}</span>;
};
