import { Icon } from '@/app/_components/Icon';
import { IconType } from '@/app/_components/Icon/Icon';
import { ServiceTypeBadge } from '@/app/admin/_components/ServiceTypeBadges';
import { DAY_OF_WEEK_LABELS_BY_INDEX } from '@/models/valueObjects/dayOfWeek';
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
	staffId: string | null;
	staffName: string | null;
	status: ShiftStatus;
	isUnassigned: boolean;
	cancelReason?: string | null;
	cancelCategory?: string | null;
};

export interface ShiftTableProps {
	shifts: ShiftDisplayRow[];
	loading?: boolean;
	onChangeStaff?: (shift: ShiftDisplayRow) => void;
	onAssignStaff?: (shift: ShiftDisplayRow) => void;
	onCancelShift?: (shift: ShiftDisplayRow) => void;
	onRestoreShift?: (shift: ShiftDisplayRow) => void;
}

const formatTime = (time: { hour: number; minute: number }): string => {
	return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

const formatDateWithDay = (date: Date): string => {
	const dateStr = formatJstDateString(date).replace(/-/g, '/');
	const dayOfWeek = DAY_OF_WEEK_LABELS_BY_INDEX[getJstDayOfWeek(date)];
	return `${dateStr}(${dayOfWeek})`;
};

const STATUS_LABELS: Record<ShiftStatus, string> = {
	scheduled: '予定',
	confirmed: '確定',
	completed: '完了',
	canceled: 'キャンセル',
};

const STATUS_ICON_NAMES: Record<ShiftStatus, IconType> = {
	scheduled: 'schedule',
	confirmed: 'check_circle',
	completed: 'check_circle',
	canceled: 'cancel',
};

const STATUS_BADGE_CLASSES: Record<ShiftStatus, string> = {
	scheduled: 'badge-info',
	confirmed: 'badge-success',
	completed: 'badge-neutral',
	canceled: 'badge-error',
};

const GRID_COLS = classNames(
	'grid-cols-[6rem_1fr_8rem_4rem]',
	'grid-areas-["status_date_time_acton""status_client_client_action""status_staff_service_action"]',
	'lg:grid-cols-[6rem_8rem_8rem_1fr_8rem_8rem_8rem]',
	"lg:grid-areas-['status_date_time_client_staff_service_action']",
	'gap-2',
	'px-4',
);

export const ShiftTable = ({
	shifts,
	loading = false,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
	onRestoreShift,
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
		<div className="max-w-2xl min-w-md lg:w-full lg:max-w-full">
			{/* Header */}
			<div
				className={`hidden lg:grid ${GRID_COLS} border-b border-base-300 bg-base-200 py-2 text-sm font-semibold`}
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
				<div role="columnheader" className="grid-area-[action]">
					操作
				</div>
			</div>
			{/* Body */}
			<div role="rowgroup">
				{shifts.map((shift) => (
					<div
						key={shift.id}
						className={`grid ${GRID_COLS} items-center border-b border-base-300 py-3 text-sm odd:bg-base-200`}
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
						<div className="flex items-center gap-1 grid-area-[staff]">
							{shift.staffName ? (
								<>
									<span>{shift.staffName}</span>
									{shift.status === 'scheduled' && (
										<button
											type="button"
											className="btn btn-circle btn-ghost btn-xs"
											onClick={() => onChangeStaff?.(shift)}
											aria-label="担当者を変更"
										>
											<Icon name="person_edit" className="text-base" />
										</button>
									)}
								</>
							) : (
								<>
									<span className="badge badge-warning">未割当</span>
									{shift.status === 'scheduled' && (
										<button
											type="button"
											className="btn btn-circle text-primary btn-ghost btn-xs"
											onClick={() => onAssignStaff?.(shift)}
											aria-label="担当者を割り当て"
										>
											<Icon name="person_add" className="text-base" />
										</button>
									)}
								</>
							)}
						</div>
						<div className="grid-area-status">
							<span
								className={`badge hidden lg:inline-block ${STATUS_BADGE_CLASSES[shift.status]}`}
							>
								{STATUS_LABELS[shift.status]}
							</span>
							<Icon
								name={STATUS_ICON_NAMES[shift.status]}
								className={classNames('lg:!hidden', {
									'text-success':
										shift.status === 'confirmed' ||
										shift.status === 'completed',
									'text-info': shift.status === 'scheduled',
									'text-error': shift.status === 'canceled',
								})}
							/>
						</div>
						<div className="grid-area-[action] lg:block">
							<ShiftActionButtons
								status={shift.status}
								onCancelShift={() => onCancelShift?.(shift)}
								onRestoreShift={() => onRestoreShift?.(shift)}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
