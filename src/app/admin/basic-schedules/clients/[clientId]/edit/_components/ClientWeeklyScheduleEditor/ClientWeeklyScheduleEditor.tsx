'use client';

import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { WEEKDAYS } from '@/models/valueObjects/dayOfWeek';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { DayColumn } from '../DayColumn';
import {
	ScheduleEditFormModal,
	type ServiceTypeOption,
	type StaffPickerOption,
} from '../ScheduleEditFormModal';
import { createInitialState, editorReducer } from './editorReducer';
import type { InitialScheduleData, ScheduleData } from './types';

export interface ClientWeeklyScheduleEditorProps {
	clientId: string;
	clientName: string;
	initialSchedules: InitialScheduleData[];
	serviceTypeOptions: ServiceTypeOption[];
	staffOptions: StaffPickerOption[];
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
	staffOptions,
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

	// フォーム送信ハンドラ
	const handleFormSubmit = useCallback(
		(data: ScheduleData) => {
			if (state.selectedScheduleId) {
				dispatch({
					type: 'UPDATE_SCHEDULE',
					payload: { id: state.selectedScheduleId, data },
				});
			} else {
				dispatch({ type: 'ADD_SCHEDULE', payload: data });
			}
		},
		[state.selectedScheduleId],
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
			<ScheduleEditFormModal
				isOpen={state.isFormOpen}
				weekday={selectedSchedule?.data.weekday ?? formWeekday}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
				initialData={selectedSchedule?.data}
				onClose={handleCloseForm}
				onSubmit={handleFormSubmit}
			/>
		</div>
	);
};
