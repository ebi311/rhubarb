'use client';

import {
	BasicScheduleForm,
	type BasicScheduleCallbackData,
} from '@/app/admin/basic-schedules/_components/BasicScheduleForm';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { WEEKDAYS } from '@/models/valueObjects/dayOfWeek';
import { timeObjectToString } from '@/utils/date';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { DayColumn } from '../DayColumn';
import { createInitialState, editorReducer } from './editorReducer';
import type { InitialScheduleData, ScheduleData } from './types';

export interface ClientWeeklyScheduleEditorProps {
	clientId: string;
	clientName: string;
	initialSchedules: InitialScheduleData[];
	serviceTypeOptions: ServiceTypeOption[];
	staffs: StaffRecord[];
	onSave: (operations: BatchSaveOperations) => Promise<void>;
}

export interface BatchSaveOperations {
	create: ScheduleData[];
	update: { id: string; data: ScheduleData }[];
	delete: string[];
}

export const ClientWeeklyScheduleEditor = ({
	clientId,
	clientName,
	initialSchedules,
	serviceTypeOptions,
	staffs,
	onSave,
}: ClientWeeklyScheduleEditorProps) => {
	const [state, dispatch] = useReducer(
		editorReducer,
		{ clientId, clientName },
		({ clientId, clientName }) => createInitialState(clientId, clientName),
	);

	// 初期データのロード
	useEffect(() => {
		dispatch({ type: 'LOAD_SCHEDULES', payload: initialSchedules });
	}, [initialSchedules]);

	// 未保存変更があるかどうかを判定
	const hasUnsavedChanges = useMemo(
		() =>
			state.schedules.some(
				(s) =>
					s.status === 'new' ||
					s.status === 'modified' ||
					s.status === 'deleted',
			),
		[state.schedules],
	);

	// ページ離脱警告
	useBeforeUnload(hasUnsavedChanges);

	// 曜日ごとにスケジュールをグループ化
	// state.schedules のみ依存（state 全体を入れると isFormOpen 変更時に不要な再計算が起きる）
	const schedulesByWeekday = useMemo(() => {
		const grouped = new Map<DayOfWeek, typeof state.schedules>();
		for (const weekday of WEEKDAYS) {
			grouped.set(
				weekday,
				state.schedules.filter((s) => s.data.weekday === weekday),
			);
		}
		return grouped;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.schedules]);

	// 現在選択されているスケジュールを取得
	const selectedSchedule = useMemo(
		() => state.schedules.find((s) => s.id === state.selectedScheduleId),
		[state.schedules, state.selectedScheduleId],
	);

	// 現在フォームで追加中の曜日
	const [formWeekday, setFormWeekday] = useState<DayOfWeek>('Mon');

	// カード追加ボタンハンドラ
	const handleAddClick = useCallback((weekday: DayOfWeek) => {
		setFormWeekday(weekday);
		dispatch({ type: 'OPEN_FORM' });
	}, []);

	// カードクリックハンドラ
	const handleCardClick = useCallback((id: string) => {
		dispatch({ type: 'OPEN_FORM', payload: id });
	}, []);

	// カード削除ボタンハンドラ
	const handleCardDelete = useCallback(
		(id: string) => {
			const schedule = state.schedules.find((s) => s.id === id);
			if (schedule?.status === 'deleted') {
				dispatch({ type: 'RESTORE_SCHEDULE', payload: id });
			} else {
				dispatch({ type: 'DELETE_SCHEDULE', payload: id });
			}
		},
		[state.schedules],
	);

	// フォーム閉じるハンドラ
	const handleCloseForm = useCallback(() => {
		dispatch({ type: 'CLOSE_FORM' });
	}, []);

	// フォーム送信ハンドラ: BasicScheduleCallbackData を ScheduleData に変換
	const handleFormSubmit = useCallback(
		(callbackData: BasicScheduleCallbackData) => {
			// スタッフ名を取得
			const staffNames = callbackData.staffIds
				.map((id) => staffs.find((s) => s.id === id)?.name)
				.filter((name): name is string => !!name);

			const data: ScheduleData = {
				weekday: callbackData.weekday,
				serviceTypeId: callbackData.serviceTypeId,
				staffIds: callbackData.staffIds,
				staffNames,
				startTime: callbackData.startTime,
				endTime: callbackData.endTime,
				note: callbackData.note,
			};

			if (state.selectedScheduleId) {
				dispatch({
					type: 'UPDATE_SCHEDULE',
					payload: { id: state.selectedScheduleId, data },
				});
			} else {
				dispatch({ type: 'ADD_SCHEDULE', payload: data });
			}
			dispatch({ type: 'CLOSE_FORM' });
		},
		[state.selectedScheduleId, staffs],
	);

	// 保存ボタンハンドラ
	const handleSave = async () => {
		dispatch({ type: 'SET_SAVING', payload: true });

		try {
			const operations: BatchSaveOperations = {
				create: state.schedules
					.filter((s) => s.status === 'new')
					.map((s) => s.data),
				update: state.schedules
					.filter((s) => s.status === 'modified' && s.originalId)
					.map((s) => ({ id: s.originalId!, data: s.data })),
				delete: state.schedules
					.filter((s) => s.status === 'deleted' && s.originalId)
					.map((s) => s.originalId!),
			};

			await onSave(operations);
		} finally {
			dispatch({ type: 'SET_SAVING', payload: false });
		}
	};

	// モーダル用の初期値を作成
	const formInitialValues = useMemo(() => {
		if (!selectedSchedule) {
			return {
				weekday: formWeekday,
			};
		}
		return {
			serviceTypeId: selectedSchedule.data.serviceTypeId,
			weekday: selectedSchedule.data.weekday,
			startTime: timeObjectToString(selectedSchedule.data.startTime),
			endTime: timeObjectToString(selectedSchedule.data.endTime),
			note: selectedSchedule.data.note ?? '',
			staffId: selectedSchedule.data.staffIds[0] ?? null,
		};
	}, [selectedSchedule, formWeekday]);

	const isEditMode = !!selectedSchedule;
	const currentWeekday = selectedSchedule?.data.weekday ?? formWeekday;

	// fixedClientId 用に serviceUsers を作成（clientId と clientName のみ）
	const serviceUsers = useMemo(
		() => [
			{
				id: clientId,
				name: clientName,
				office_id: '',
				contract_status: 'active' as const,
				created_at: new Date(),
				updated_at: new Date(),
			},
		],
		[clientId, clientName],
	);

	return (
		<div className="space-y-4">
			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold">{clientName}</h2>
				<button
					type="button"
					className="btn btn-primary"
					onClick={handleSave}
					disabled={state.isSaving}
				>
					{state.isSaving ? (
						<span className="loading loading-sm loading-spinner" />
					) : null}
					登録する
				</button>
			</div>

			{/* グリッド */}
			<div className="grid grid-cols-7 gap-1 overflow-hidden rounded-lg border border-base-300">
				{WEEKDAYS.map((weekday) => (
					<DayColumn
						key={weekday}
						weekday={weekday}
						schedules={schedulesByWeekday.get(weekday) || []}
						onAddClick={handleAddClick}
						onCardClick={handleCardClick}
						onCardDelete={handleCardDelete}
					/>
				))}
			</div>

			{/* 編集モーダル */}
			{state.isFormOpen && (
				<dialog
					className="modal-open modal"
					open
					aria-modal="true"
					onClose={handleCloseForm}
				>
					<div className="modal-box max-w-lg">
						<h3 className="mb-4 text-lg font-bold">
							{isEditMode ? '予定を編集' : '予定を追加'}
						</h3>
						<BasicScheduleForm
							serviceUsers={serviceUsers}
							serviceTypes={serviceTypeOptions}
							staffs={staffs}
							initialValues={formInitialValues}
							mode={isEditMode ? 'edit' : 'create'}
							fixedClientId={clientId}
							fixedWeekday={currentWeekday}
							onCancel={handleCloseForm}
							onFormSubmit={handleFormSubmit}
							asModal
						/>
					</div>
					<form method="dialog" className="modal-backdrop">
						<button aria-label="モーダルを閉じる">close</button>
					</form>
				</dialog>
			)}
		</div>
	);
};
