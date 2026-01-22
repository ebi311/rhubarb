import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { ServiceTypeBadge } from './ServiceTypeBadge';

type ServiceTypeBadgesProps = {
	/** サービス区分IDの配列 */
	serviceTypeIds: ServiceTypeId[];
	/** 空の場合に表示するラベル */
	emptyLabel?: string;
	/** バッジサイズ */
	size?: 'sm' | 'md';
	/** 追加のCSSクラス */
	className?: string;
};

/**
 * 複数のサービス区分バッジを表示するコンポーネント
 */
export const ServiceTypeBadges = ({
	serviceTypeIds,
	emptyLabel = '未割当',
	size = 'sm',
	className = '',
}: ServiceTypeBadgesProps) => {
	const containerClassName = ['flex flex-wrap gap-2', className]
		.filter(Boolean)
		.join(' ');

	if (serviceTypeIds.length === 0) {
		return (
			<span className={[containerClassName, 'text-base-content/60'].join(' ')}>
				{emptyLabel}
			</span>
		);
	}

	return (
		<div className={containerClassName}>
			{serviceTypeIds.map((id) => (
				<ServiceTypeBadge key={id} serviceTypeId={id} size={size} />
			))}
		</div>
	);
};

export type { ServiceTypeBadgesProps };
