import { WEEKDAYS, WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import Link from 'next/link';
import React from 'react';
import type {
	StaffBasicScheduleGridViewModel,
	StaffScheduleCell,
} from './types';

interface StaffBasicScheduleGridProps {
	schedules: StaffBasicScheduleGridViewModel[];
}

export const StaffBasicScheduleGrid = ({
	schedules,
}: StaffBasicScheduleGridProps) => {
	if (schedules.length === 0) {
		return (
			<div className="flex min-h-[400px] items-center justify-center rounded-lg border border-base-300 bg-base-100 p-8">
				<p className="text-base-content/60">
					条件に一致する基本スケジュールがありません
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<div
				className="grid gap-px bg-base-300"
				style={{
					gridTemplateColumns: '10rem repeat(7, minmax(150px, 1fr))',
				}}
			>
				{/* ヘッダー行 */}
				<div className="bg-base-200 p-3 font-semibold">スタッフ名</div>
				{WEEKDAYS.map((day) => (
					<div key={day} className="bg-base-200 p-3 font-semibold">
						{WEEKDAY_FULL_LABELS[day]}
					</div>
				))}

				{/* データ行 */}
				{schedules.map((schedule, index) => (
					<React.Fragment key={schedule.staffId ?? `unassigned-${index}`}>
						{/* スタッフ名セル */}
						<div
							className={`p-3 font-medium ${
								schedule.staffName === '未割り当て'
									? 'bg-warning/10 text-warning-content'
									: 'bg-base-100'
							}`}
						>
							{schedule.staffName}
						</div>

						{/* 各曜日のセル */}
						{WEEKDAYS.map((day) => {
							const cells = schedule.schedulesByWeekday[day];
							return (
								<div
									key={`${schedule.staffId ?? 'unassigned'}-${day}`}
									className={
										schedule.staffName === '未割り当て'
											? 'bg-warning/10 p-2'
											: 'bg-base-100 p-2'
									}
								>
									{cells && cells.length > 0 ? (
										<div className="flex flex-col gap-2">
											{cells.map((cell) => (
												<ScheduleCell key={cell.id} cell={cell} />
											))}
										</div>
									) : (
										<div className="min-h-[60px] rounded bg-base-200/50" />
									)}
								</div>
							);
						})}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

interface ScheduleCellProps {
	cell: StaffScheduleCell;
}

/**
 * サービス区分ごとの背景色設定（Googleカレンダー風）
 */
const SERVICE_TYPE_COLORS: Record<ServiceTypeId, { bg: string; text: string }> =
	{
		'physical-care': {
			bg: 'bg-blue-500',
			text: 'text-white',
		},
		'life-support': {
			bg: 'bg-emerald-500',
			text: 'text-white',
		},
		'commute-support': {
			bg: 'bg-violet-500',
			text: 'text-white',
		},
	};

const ScheduleCell = ({ cell }: ScheduleCellProps) => {
	const colors = SERVICE_TYPE_COLORS[cell.serviceTypeId];

	return (
		<Link
			href={`/admin/basic-schedules/${cell.id}/edit`}
			className={`block rounded p-2 text-sm ${colors.bg} ${colors.text} transition-opacity hover:opacity-80`}
			title={cell.note || undefined}
		>
			<div className="font-medium">{cell.timeRange}</div>
			<div className="mt-1">{cell.clientName}</div>
		</Link>
	);
};
