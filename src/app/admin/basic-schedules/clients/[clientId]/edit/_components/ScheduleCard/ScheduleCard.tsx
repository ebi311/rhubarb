import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { timeObjectToString } from '@/utils/date';
import type {
	EditableSchedule,
	EditStatus,
} from '../ClientWeeklyScheduleEditor/types';

interface ScheduleCardProps {
	schedule: EditableSchedule;
	onClick: (id: string) => void;
	onDelete: (id: string) => void;
}

/**
 * サービス区分ごとの背景色設定
 */
const serviceTypeBackgroundMap: Record<ServiceTypeId, string> = {
	'physical-care': 'bg-blue-500 text-white',
	'life-support': 'bg-emerald-500 text-white',
	'commute-support': 'bg-violet-500 text-white',
};

/**
 * ステータスに応じたバッジ設定
 */
const statusBadgeConfig: Record<
	EditStatus,
	{ label: string; className: string } | null
> = {
	unchanged: null,
	new: { label: '新規', className: 'badge-success' },
	modified: { label: '変更', className: 'badge-warning' },
	deleted: { label: '削除', className: 'badge-error' },
};

export const ScheduleCard = ({
	schedule,
	onClick,
	onDelete,
}: ScheduleCardProps) => {
	const { id, status, data } = schedule;
	const { serviceTypeId, staffNames, startTime, endTime } = data;

	const bgColorClass =
		serviceTypeBackgroundMap[serviceTypeId] || 'bg-gray-500 text-white';

	const staffText = staffNames.length > 0 ? staffNames.join(', ') : '(未設定)';

	const timeRange = `${timeObjectToString(startTime)} - ${timeObjectToString(endTime)}`;

	const isDeleted = status === 'deleted';
	const badgeConfig = statusBadgeConfig[status];

	const handleCardClick = () => {
		if (!isDeleted) {
			onClick(id);
		}
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete(id);
	};

	return (
		<div
			data-testid="schedule-card"
			className={`relative rounded p-2 ${bgColorClass} ${isDeleted ? 'line-through opacity-60' : 'cursor-pointer hover:opacity-80'} transition-opacity`}
			onClick={handleCardClick}
		>
			{/* ステータスバッジ */}
			{badgeConfig && (
				<span
					role="status"
					className={`absolute -top-2 -right-2 badge badge-xs ${badgeConfig.className}`}
				>
					{badgeConfig.label}
				</span>
			)}

			{/* 時間帯 */}
			<div className="text-xs font-semibold">{timeRange}</div>

			{/* 担当者 */}
			<div className="mt-1 truncate text-xs">{staffText}</div>

			{/* 削除/復元ボタン */}
			<button
				type="button"
				className="btn absolute right-1 bottom-1 text-xs opacity-70 btn-ghost btn-xs hover:opacity-100"
				onClick={handleDeleteClick}
				aria-label={isDeleted ? '復元' : '削除'}
			>
				{isDeleted ? '復元' : '✕'}
			</button>
		</div>
	);
};
