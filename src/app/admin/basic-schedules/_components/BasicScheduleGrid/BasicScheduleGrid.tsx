'use client';

import { getBasicScheduleByIdAction } from '@/app/actions/basicSchedules';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { WEEKDAYS, WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import type { TimeValue } from '@/models/valueObjects/time';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import {
	BasicScheduleForm,
	type BasicScheduleFormInitialValues,
} from '../BasicScheduleForm';
import { AddButton } from './AddButton';
import type { BasicScheduleCell, BasicScheduleGridViewModel } from './types';

interface BasicScheduleGridProps {
	schedules: BasicScheduleGridViewModel[];
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
}

/** TimeValue を "HH:MM" 形式の文字列に変換 */
const formatTimeForInput = (time: TimeValue): string => {
	const hour = time.hour.toString().padStart(2, '0');
	const minute = time.minute.toString().padStart(2, '0');
	return `${hour}:${minute}`;
};

/** BasicScheduleRecord を BasicScheduleFormInitialValues に変換 */
const toFormInitialValues = (
	schedule: BasicScheduleRecord,
): BasicScheduleFormInitialValues => ({
	clientId: schedule.client.id,
	serviceTypeId: schedule.service_type_id,
	weekday: schedule.weekday,
	startTime: formatTimeForInput(schedule.start_time),
	endTime: formatTimeForInput(schedule.end_time),
	note: schedule.note ?? '',
	staffId: schedule.staffs.length > 0 ? schedule.staffs[0].id : null,
});

type EditModalState = {
	scheduleId: string;
	clientId: string;
	clientName: string;
	isLoading: boolean;
	initialValues: BasicScheduleFormInitialValues | null;
};

export const BasicScheduleGrid = ({
	schedules,
	serviceTypes,
	staffs,
}: BasicScheduleGridProps) => {
	const router = useRouter();
	const { handleActionResult } = useActionResultHandler();
	const [editModal, setEditModal] = useState<EditModalState | null>(null);

	const handleCloseEditModal = useCallback(() => {
		setEditModal(null);
	}, []);

	const handleEditSuccess = useCallback(() => {
		setEditModal(null);
		router.refresh();
	}, [router]);

	const handlePillClick = useCallback(
		async (cell: BasicScheduleCell, clientId: string, clientName: string) => {
			setEditModal({
				scheduleId: cell.id,
				clientId,
				clientName,
				isLoading: true,
				initialValues: null,
			});

			const result = await getBasicScheduleByIdAction(cell.id);
			handleActionResult(result, {
				errorMessage: 'スケジュールの取得に失敗しました',
				onSuccess: (data) => {
					if (data) {
						setEditModal((prev) =>
							prev
								? {
										...prev,
										isLoading: false,
										initialValues: toFormInitialValues(data),
									}
								: null,
						);
					}
				},
				onError: () => {
					setEditModal(null);
				},
			});
		},
		[handleActionResult],
	);

	// 編集ダイアログ用の serviceUsers を構築
	const editServiceUsers = editModal
		? [
				{
					id: editModal.clientId,
					name: editModal.clientName,
					office_id: '',
					contract_status: 'active' as const,
					created_at: new Date(),
					updated_at: new Date(),
				},
			]
		: [];

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
		<>
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
														<ScheduleCell
															key={cell.id}
															cell={cell}
															onClick={() =>
																handlePillClick(
																	cell,
																	schedule.clientId,
																	schedule.clientName,
																)
															}
														/>
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

			{/* 編集ダイアログ */}
			{editModal && (
				<dialog
					className="modal-open modal"
					open
					aria-modal="true"
					onClose={handleCloseEditModal}
				>
					<div className="modal-box">
						<h3 className="mb-4 text-lg font-bold">予定を編集</h3>
						{editModal.isLoading ? (
							<div className="flex justify-center py-8">
								<span className="loading loading-lg loading-spinner" />
							</div>
						) : (
							editModal.initialValues && (
								<BasicScheduleForm
									serviceUsers={editServiceUsers}
									serviceTypes={serviceTypes}
									staffs={staffs}
									mode="edit"
									scheduleId={editModal.scheduleId}
									initialValues={editModal.initialValues}
									fixedClientId={editModal.clientId}
									asModal
									onSubmitSuccess={handleEditSuccess}
									onDeleteSuccess={handleEditSuccess}
									onCancel={handleCloseEditModal}
								/>
							)
						)}
					</div>
					<form method="dialog" className="modal-backdrop">
						<button
							aria-label="モーダルを閉じる"
							onClick={handleCloseEditModal}
						>
							close
						</button>
					</form>
				</dialog>
			)}
		</>
	);
};

interface ScheduleCellProps {
	cell: BasicScheduleCell;
	onClick: () => void;
}

/**
 * サービス区分ごとの背景色設定（Googleカレンダー風）
 */
const serviceTypeBackgroundMap: Record<string, string> = {
	'physical-care': 'bg-blue-500 text-white',
	'life-support': 'bg-emerald-500 text-white',
	'commute-support': 'bg-violet-500 text-white',
};

const ScheduleCell = ({ cell, onClick }: ScheduleCellProps) => {
	const bgColorClass =
		serviceTypeBackgroundMap[cell.serviceTypeId] || 'bg-gray-500 text-white';

	const staffText =
		cell.staffNames.length > 0 ? cell.staffNames.join(', ') : '(未設定)';

	return (
		<button
			type="button"
			className={`block w-full cursor-pointer rounded p-2 text-left ${bgColorClass} transition-opacity hover:opacity-80`}
			data-testid={`basic-schedule-cell-${cell.id}`}
			aria-label={`${cell.timeRange} 担当: ${staffText}`}
			onClick={onClick}
		>
			<div className="mb-1 text-sm font-semibold">{cell.timeRange}</div>
			<div className="text-xs opacity-90">{staffText}</div>
		</button>
	);
};
