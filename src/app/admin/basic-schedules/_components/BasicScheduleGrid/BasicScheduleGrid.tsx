import { ServiceTypeBadges } from '@/app/admin/_components/ServiceTypeBadges';
import { WEEKDAYS, WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import React from 'react';
import type { BasicScheduleCell, BasicScheduleGridViewModel } from './types';

interface BasicScheduleGridProps {
	schedules: BasicScheduleGridViewModel[];
}

export const BasicScheduleGrid = ({ schedules }: BasicScheduleGridProps) => {
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
					gridTemplateColumns: '200px repeat(7, minmax(150px, 1fr))',
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
							className="bg-base-100 p-3 font-medium"
						>
							{schedule.clientName}
						</div>

						{/* 各曜日のセル */}
						{WEEKDAYS.map((day) => {
							const cells = schedule.schedulesByWeekday[day];
							return (
								<div
									key={`${schedule.clientId}-${day}`}
									className="bg-base-100 p-2"
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
	cell: BasicScheduleCell;
}

const ScheduleCell = ({ cell }: ScheduleCellProps) => (
	<div className="rounded border border-base-300 bg-base-100 p-2">
		<div className="mb-1 text-sm font-semibold">{cell.timeRange}</div>
		<div className="mb-1">
			<ServiceTypeBadges serviceTypeIds={[cell.serviceTypeId]} />
		</div>
		<div className="text-sm text-base-content/80">
			{cell.staffNames.join(', ')}
		</div>
		{cell.note && (
			<div className="mt-1 text-xs text-base-content/60">{cell.note}</div>
		)}
	</div>
);
