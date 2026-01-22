import { ServiceTypeBadge } from '@/app/admin/_components/ServiceTypeBadges';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { formatJstDateString, getJstDayOfWeek } from '@/utils/date';
import classNames from 'classnames';
import { ShiftActionButtons } from '../ShiftActionButtons';

export type ShiftStatus = 'scheduled' | 'confirmed' | 'completed' | 'canceled';

export type ShiftDisplayRow = {
	id: string;
	date: Date;
	startTime: { hour: number; minute: number };
	endTime: { hour: number; minute: number };
	clientName: string;
	serviceTypeId: ServiceTypeId;
	staffName: string | null;
	status: ShiftStatus;
	isUnassigned: boolean;
};

export interface ShiftTableProps {
	shifts: ShiftDisplayRow[];
	loading?: boolean;
	onChangeStaff?: (shift: ShiftDisplayRow) => void;
	onAssignStaff?: (shift: ShiftDisplayRow) => void;
	onCancelShift?: (shift: ShiftDisplayRow) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

const formatTime = (time: { hour: number; minute: number }): string => {
	return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

const formatDateWithDay = (date: Date): string => {
	const dateStr = formatJstDateString(date).replace(/-/g, '/');
	const dayOfWeek = DAY_NAMES[getJstDayOfWeek(date)];
	return `${dateStr}(${dayOfWeek})`;
};

const STATUS_LABELS: Record<ShiftStatus, string> = {
	scheduled: '予定',
	confirmed: '確定',
	completed: '完了',
	canceled: 'キャンセル',
};

const STATUS_BADGE_CLASSES: Record<ShiftStatus, string> = {
	scheduled: 'badge-info',
	confirmed: 'badge-success',
	completed: 'badge-neutral',
	canceled: 'badge-error',
};

const GRID_COLS = classNames(
	'grid',
	'grid-cols-[8rem_10rem_1fr]',
	'grid-areas-["date_time_client""staff_service_status"]',
	'lg:grid-cols-[8rem_8rem_1fr_8rem_8rem_6rem_8rem]',
	"lg:grid-areas-['date_time_client_staff_service_status_action']",
	'gap-2',
	'px-4',
);

export const ShiftTable = ({
	shifts,
	loading = false,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
}: ShiftTableProps) => {
	if (loading) {
		return (
			<div className="flex justify-center py-8" role="status">
				<span className="loading loading-lg loading-spinner" />
			</div>
		);
	}

	if (shifts.length === 0) {
		return (
			<div className="py-8 text-center text-gray-500">シフトがありません</div>
		);
	}

	return (
		<div className="min-w-md lg:w-full">
			{/* Header */}
			<div
				className={`${GRID_COLS} border-b border-base-300 bg-base-200 py-2 text-sm font-semibold`}
				role="row"
				aria-label="ヘッダー行"
			>
				<div role="columnheader" className="grid-area-[date]">
					日付
				</div>
				<div role="columnheader" className="grid-area-[time]">
					時間
				</div>
				<div role="columnheader" className="grid-area-[client]">
					利用者
				</div>
				<div role="columnheader" className="grid-area-[service]">
					サービス区分
				</div>
				<div role="columnheader" className="grid-area-[staff]">
					担当者
				</div>
				<div role="columnheader" className="grid-area-[status]">
					ステータス
				</div>
				<div role="columnheader" className="hidden grid-area-[action] lg:block">
					操作
				</div>
			</div>
			{/* Body */}
			<div role="rowgroup">
				{shifts.map((shift) => (
					<div
						key={shift.id}
						className={`${GRID_COLS} items-center border-b border-base-300 py-3 text-sm odd:bg-base-200`}
						role="row"
					>
						<div className="text-lg grid-area-[date] lg:text-base">
							{formatDateWithDay(shift.date)}
						</div>
						<div className="text-lg grid-area-[time] lg:text-base">
							{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
						</div>
						<div className="text-lg grid-area-[client] lg:text-base">
							{shift.clientName}
						</div>
						<div className="grid-area-[service]">
							<ServiceTypeBadge serviceTypeId={shift.serviceTypeId} size="sm" />
						</div>
						<div className="grid-area-[staff]">
							{shift.staffName ? (
								shift.staffName
							) : (
								<span className="badge badge-warning">未割当</span>
							)}
						</div>
						<div className="grid-area-status">
							<span className={`badge ${STATUS_BADGE_CLASSES[shift.status]}`}>
								{STATUS_LABELS[shift.status]}
							</span>
						</div>
						<div className="hidden grid-area-[action] lg:block">
							<ShiftActionButtons
								status={shift.status}
								isUnassigned={shift.isUnassigned}
								onChangeStaff={() => onChangeStaff?.(shift)}
								onAssignStaff={() => onAssignStaff?.(shift)}
								onCancelShift={() => onCancelShift?.(shift)}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
