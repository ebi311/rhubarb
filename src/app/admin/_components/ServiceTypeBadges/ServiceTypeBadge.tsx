import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { ServiceTypeLabels } from '@/models/valueObjects/serviceTypeId';

type ServiceTypeBadgeProps = {
	/** サービス区分ID */
	serviceTypeId: ServiceTypeId;
	/** バッジサイズ */
	size?: 'sm' | 'md';
	/** 追加のCSSクラス */
	className?: string;
};

/**
 * サービス区分ごとの色設定
 * light/dark mode 両対応
 */
const serviceTypeColorMap: Record<ServiceTypeId, string> = {
	// 身体介護: 青系 (信頼感・安心感を表現)
	'physical-care':
		'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
	// 生活支援: 緑系 (生活・日常を表現)
	'life-support':
		'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
	// 通院サポート: 紫系 (医療・専門性を表現)
	'commute-support':
		'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-700',
};

const sizeClassMap: Record<
	NonNullable<ServiceTypeBadgeProps['size']>,
	string
> = {
	sm: 'text-xs px-2 py-0.5',
	md: 'text-sm px-2.5 py-1',
};

/**
 * サービス区分を表示する単一バッジコンポーネント
 * 各サービス区分に固有の色が設定されており、light/dark mode に対応
 */
export const ServiceTypeBadge = ({
	serviceTypeId,
	size = 'sm',
	className = '',
}: ServiceTypeBadgeProps) => {
	const label = ServiceTypeLabels[serviceTypeId];
	const colorClass = serviceTypeColorMap[serviceTypeId];
	const sizeClass = sizeClassMap[size];

	return (
		<span
			className={[
				'inline-flex items-center rounded-full border font-medium',
				colorClass,
				sizeClass,
				className,
			]
				.filter(Boolean)
				.join(' ')}
		>
			{label}
		</span>
	);
};

export type { ServiceTypeBadgeProps };
