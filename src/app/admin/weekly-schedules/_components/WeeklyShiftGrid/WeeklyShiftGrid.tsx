'use client';

import { Icon } from '@/app/_components/Icon';
import { DAY_OF_WEEK_LABELS_BY_INDEX } from '@/models/valueObjects/dayOfWeek';
import { addJstDays, formatJstDateString, getJstDayOfWeek } from '@/utils/date';
import classNames from 'classnames';
import React from 'react';
import type { ShiftDisplayRow, ShiftStatus } from '../ShiftTable';
import { transformToGridViewModel } from './transformToGridViewModel';
import type { WeeklyShiftCell } from './types';

interface WeeklyShiftGridProps {
	shifts: ShiftDisplayRow[];
	weekStartDate: Date;
	onAddOneOffShift?: (dateStr: string, clientId?: string) => void;
	onChangeStaff?: (shift: ShiftDisplayRow) => void;
	onAssignStaff?: (shift: ShiftDisplayRow) => void;
	onCancelShift?: (shift: ShiftDisplayRow) => void;
	onRestoreShift?: (shift: ShiftDisplayRow) => void;
}

/**
 * 日付を MM/DD(曜) 形式でフォーマット
 */
const formatDateHeader = (date: Date): string => {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const dayOfWeek = DAY_OF_WEEK_LABELS_BY_INDEX[getJstDayOfWeek(date)];
	return `${month}/${day}(${dayOfWeek})`;
};

/**
 * 週の日付リストを生成（月曜から日曜まで）
 */
const getWeekDates = (weekStartDate: Date): Date[] => {
	const dates: Date[] = [];
	for (let i = 0; i < 7; i++) {
		dates.push(addJstDays(weekStartDate, i));
	}
	return dates;
};

/**
 * ShiftDisplayRow を週の中から探す
 */
const findShiftFromCell = (
	cell: WeeklyShiftCell,
	shifts: ShiftDisplayRow[],
): ShiftDisplayRow | undefined => {
	return shifts.find((s) => s.id === cell.id);
};

export const WeeklyShiftGrid = ({
	shifts,
	weekStartDate,
	onAddOneOffShift,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
	onRestoreShift,
}: WeeklyShiftGridProps) => {
	const gridData = transformToGridViewModel(shifts);
	const weekDates = getWeekDates(weekStartDate);

	if (gridData.length === 0) {
		return (
			<div className="flex min-h-[400px] items-center justify-center rounded-lg border border-base-300 bg-base-100 p-8">
				<p className="text-base-content/60">シフトがありません</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<div
				className="grid gap-px bg-base-300"
				style={{
					gridTemplateColumns: '10rem repeat(7, minmax(140px, 1fr))',
				}}
			>
				{/* ヘッダー行 */}
				<div className="bg-base-200 p-3 font-semibold">利用者名</div>
				{weekDates.map((date) => (
					<div
						key={formatJstDateString(date)}
						className="bg-base-200 p-3 text-center font-semibold"
					>
						{formatDateHeader(date)}
					</div>
				))}

				{/* データ行 */}
				{gridData.map((clientRow) => (
					<React.Fragment key={clientRow.clientId}>
						{/* 利用者名セル */}
						<div className="bg-base-100 p-3 font-medium">
							{clientRow.clientName}
						</div>

						{/* 各日付のセル */}
						{weekDates.map((date) => {
							const dateKey = formatJstDateString(date);
							const cells = clientRow.shiftsByDate[dateKey];
							const hasShifts = !!cells && cells.length > 0;
							return (
								<div
									key={`${clientRow.clientId}-${dateKey}`}
									data-testid={`weekly-shift-grid-cell-${clientRow.clientId}-${dateKey}`}
									className="weekly-shift-grid-cell group flex h-full flex-col bg-base-100 p-2"
								>
									{hasShifts ? (
										<>
											<div
												data-testid="weekly-shift-grid-cell-shifts"
												className="flex flex-col gap-2"
											>
												{cells.map((cell) => (
													<ShiftCell
														key={cell.id}
														cell={cell}
														shift={findShiftFromCell(cell, shifts)}
														onChangeStaff={onChangeStaff}
														onAssignStaff={onAssignStaff}
														onCancelShift={onCancelShift}
														onRestoreShift={onRestoreShift}
													/>
												))}
											</div>
											<div
												data-testid="weekly-shift-grid-cell-add-button-container"
												className="mt-auto flex justify-center"
											>
												<button
													type="button"
													className="btn invisible btn-circle btn-sm btn-secondary group-hover:visible"
													aria-label="単発シフト追加"
													onClick={(e) => {
														e.stopPropagation();
														onAddOneOffShift?.(dateKey, clientRow.clientId);
													}}
												>
													<Icon name="add" />
												</button>
											</div>
										</>
									) : (
										<>
											<div
												data-testid="weekly-shift-grid-cell-add-button-container"
												className="flex justify-center"
											>
												<button
													type="button"
													className="btn invisible btn-circle btn-sm btn-secondary group-hover:visible"
													aria-label="単発シフト追加"
													onClick={(e) => {
														e.stopPropagation();
														onAddOneOffShift?.(dateKey, clientRow.clientId);
													}}
												>
													<Icon name="add" />
												</button>
											</div>
											<div
												data-testid="weekly-shift-grid-cell-placeholder"
												className="min-h-[60px] rounded bg-base-200/50"
											/>
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

interface ShiftCellProps {
	cell: WeeklyShiftCell;
	shift?: ShiftDisplayRow;
	onChangeStaff?: (shift: ShiftDisplayRow) => void;
	onAssignStaff?: (shift: ShiftDisplayRow) => void;
	onCancelShift?: (shift: ShiftDisplayRow) => void;
	onRestoreShift?: (shift: ShiftDisplayRow) => void;
}

/**
 * サービス区分ごとの背景色設定
 */
const serviceTypeBackgroundMap: Record<string, string> = {
	'physical-care': 'bg-blue-500',
	'life-support': 'bg-emerald-500',
	'commute-support': 'bg-violet-500',
};

const getStatusStyles = (status: ShiftStatus): string => {
	if (status === 'canceled') {
		return 'opacity-50 line-through';
	}
	return '';
};

const ShiftCell = ({
	cell,
	shift,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
	onRestoreShift,
}: ShiftCellProps) => {
	const bgColorClass =
		serviceTypeBackgroundMap[cell.serviceTypeId] || 'bg-gray-500';
	const statusStyles = getStatusStyles(cell.status);

	const handleStaffAction = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!shift) return;
		if (cell.isUnassigned) {
			onAssignStaff?.(shift);
		} else {
			onChangeStaff?.(shift);
		}
	};

	const handleCancelAction = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!shift) return;
		onCancelShift?.(shift);
	};

	const handleRestoreAction = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!shift) return;
		onRestoreShift?.(shift);
	};

	return (
		<div
			className={classNames(
				'group relative rounded p-2 text-white transition-all',
				bgColorClass,
				statusStyles,
			)}
			data-testid={`weekly-shift-cell-${cell.id}`}
		>
			{/* 時間 */}
			<div className="text-sm font-semibold">{cell.timeRange}</div>

			{/* 担当者 */}
			<div className="flex items-center gap-1 text-xs">
				{cell.staffName ? (
					<span className="truncate opacity-90">{cell.staffName}</span>
				) : (
					<span className="badge badge-xs badge-warning">未割当</span>
				)}
			</div>

			{/* ステータス */}
			{cell.status === 'canceled' && (
				<div className="text-xs opacity-75">キャンセル</div>
			)}

			{/* ホバー時のアクションボタン */}
			<div className="absolute inset-0 flex items-center justify-center gap-1 rounded bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
				{cell.status === 'scheduled' && (
					<>
						<button
							type="button"
							className="btn btn-circle text-white btn-ghost btn-xs hover:bg-white/20"
							onClick={handleStaffAction}
							aria-label={
								cell.isUnassigned ? '担当者を割り当て' : '担当者を変更'
							}
						>
							<Icon
								name={cell.isUnassigned ? 'person_add' : 'person_edit'}
								className="text-base"
							/>
						</button>
						<button
							type="button"
							className="btn btn-circle text-white btn-ghost btn-xs hover:bg-white/20"
							onClick={handleCancelAction}
							aria-label="キャンセル"
						>
							<Icon name="cancel" className="text-base" />
						</button>
					</>
				)}
				{cell.status === 'canceled' && (
					<button
						type="button"
						className="btn btn-circle text-white btn-ghost btn-xs hover:bg-white/20"
						onClick={handleRestoreAction}
						aria-label="復元"
					>
						<Icon name="undo" className="text-base" />
					</button>
				)}
			</div>
		</div>
	);
};
