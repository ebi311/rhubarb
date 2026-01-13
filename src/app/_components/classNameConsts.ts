import classNames from 'classnames';

export const classNameConsts = {
	selectableRow: classNames(
		'grid items-center gap-x-4 gap-y-2',
		'px-4 py-3',
		'cursor-pointer',
		'transition-colors duration-500',
		'hover:bg-primary/10 focus:bg-primary/10 focus:ring-2 focus:ring-primary focus:outline-none',
		'even:bg-base-200',
	),
};
