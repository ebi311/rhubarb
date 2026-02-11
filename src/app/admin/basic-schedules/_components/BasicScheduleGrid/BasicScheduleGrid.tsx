import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { WEEKDAYS, WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import Link from 'next/link';
import React from 'react';
import { AddButton } from './AddButton';
import type { BasicScheduleCell, BasicScheduleGridViewModel } from './types';

interface BasicScheduleGridProps {
	schedules: BasicScheduleGridViewModel[];
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
}

export const BasicScheduleGrid = ({
	schedules,
	serviceTypes,
	staffs,
}: BasicScheduleGridProps) => {
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
				<div className="bg-base-200 p-3 font-semibold">利用者名</div>
				{WEEKDAYS.map((day) => (
					<div key={day} className="bg-base-200 p-3 font-semibold">
						{WEEKDAY_FULL_LABELS[day]}
					</div>
				))}

				{/* データ行 */}
				{schedules.map((schedule) => (
					<React.Fragment key={schedule.clientId}>
						{/* 利用者名セル */}
						<div
							key={`client-${schedule.clientId}`}
							className="flex items-center gap-2 bg-base-100 p-3 font-medium"
						>
							<span className="flex-1">{schedule.clientName}</span>
							<Link
								href={`/admin/basic-schedules/clients/${schedule.clientId}/edit`}
								className="btn btn-ghost btn-xs"
								title="一括編集"
								aria-label="一括編集"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="size-4"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
									/>
								</svg>
							</Link>
						</div>

						{/* 各曜日のセル */}
						{WEEKDAYS.map((day) => {
							const cells = schedule.schedulesByWeekday[day];
							return (
								<div
									key={`${schedule.clientId}-${day}`}
									className="group flex flex-col items-center justify-start gap-1 bg-base-100 p-2"
								>
									{cells && cells.length > 0 ? (
										<>
											<div className="flex flex-col gap-2">
												{cells.map((cell) => (
													<ScheduleCell key={cell.id} cell={cell} />
												))}
											</div>
											<AddButton
												weekday={day}
												serviceTypes={serviceTypes}
												staffs={staffs}
												clientId={schedule.clientId}
												clientName={schedule.clientName}
											/>
										</>
									) : (
										<>
											<AddButton
												weekday={day}
												serviceTypes={serviceTypes}
												staffs={staffs}
												clientId={schedule.clientId}
												clientName={schedule.clientName}
											/>
											<div className="min-h-[60px] rounded bg-base-200/50" />
										</>
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
	cell: BasicScheduleCell;
}

/**
 * サービス区分ごとの背景色設定（Googleカレンダー風）
 */
const serviceTypeBackgroundMap: Record<string, string> = {
	'physical-care': 'bg-blue-500 text-white',
	'life-support': 'bg-emerald-500 text-white',
	'commute-support': 'bg-violet-500 text-white',
};

const ScheduleCell = ({ cell }: ScheduleCellProps) => {
	const bgColorClass =
		serviceTypeBackgroundMap[cell.serviceTypeId] || 'bg-gray-500 text-white';

	const staffText =
		cell.staffNames.length > 0 ? cell.staffNames.join(', ') : '(未設定)';

	return (
		<Link
			href={`/admin/basic-schedules/${cell.id}/edit`}
			className={`block rounded p-2 ${bgColorClass} transition-opacity hover:opacity-80`}
			data-testid={`basic-schedule-cell-${cell.id}`}
			aria-label={`${cell.timeRange} 担当: ${staffText}`}
		>
			<div className="mb-1 text-sm font-semibold">{cell.timeRange}</div>
			<div className="text-xs opacity-90">{staffText}</div>
		</Link>
	);
};
