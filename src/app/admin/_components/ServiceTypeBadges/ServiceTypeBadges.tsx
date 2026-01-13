type ServiceTypeBadgesProps = {
	names: string[];
	emptyLabel?: string;
	badgeSize?: 'sm' | 'md';
	className?: string;
};

const badgeSizeClassMap: Record<NonNullable<ServiceTypeBadgesProps['badgeSize']>, string> = {
	sm: 'badge-sm',
	md: '',
};

export const ServiceTypeBadges = ({
	names,
	emptyLabel = '未割当',
	badgeSize = 'sm',
	className = '',
}: ServiceTypeBadgesProps) => {
	const containerClassName = ['flex flex-wrap gap-2', className].filter(Boolean).join(' ');
	if (names.length === 0) {
		return (
			<span className={[containerClassName, 'text-base-content/60'].join(' ')}>{emptyLabel}</span>
		);
	}

	return (
		<div className={containerClassName}>
			{names.map((name, index) => (
				<span
					key={`${name}-${index}`}
					className={['badge badge-outline badge-primary', badgeSizeClassMap[badgeSize]]
						.join(' ')
						.trim()}
				>
					{name}
				</span>
			))}
		</div>
	);
};

export type { ServiceTypeBadgesProps };
