import { describe, expect, it } from 'vitest';
import { createInitialState, editorReducer } from './editorReducer';
import type {
	EditableSchedule,
	EditorState,
	InitialScheduleData,
	ScheduleData,
} from './types';

const createTestScheduleData = (
	overrides: Partial<ScheduleData> = {},
): ScheduleData => ({
	weekday: 'Mon',
	serviceTypeId: 'life-support',
	staffIds: ['staff-1'],
	staffNames: ['山田太郎'],
	startTime: { hour: 9, minute: 0 },
	endTime: { hour: 10, minute: 0 },
	note: null,
	...overrides,
});

const createTestSchedule = (
	overrides: Partial<EditableSchedule> = {},
): EditableSchedule => ({
	id: 'test-id-1',
	originalId: 'test-id-1',
	status: 'unchanged',
	data: createTestScheduleData(),
	...overrides,
});

describe('editorReducer', () => {
	describe('createInitialState', () => {
		it('クライアント情報と空のスケジュールで初期状態を作成する', () => {
			const state = createInitialState('client-1', '田中一郎');

			expect(state.clientId).toBe('client-1');
			expect(state.clientName).toBe('田中一郎');
			expect(state.schedules).toEqual([]);
			expect(state.selectedScheduleId).toBeNull();
			expect(state.isFormOpen).toBe(false);
			expect(state.isSaving).toBe(false);
		});
	});

	describe('LOAD_SCHEDULES', () => {
		it('初期データをロードして unchanged 状態でセットする', () => {
			const initialState = createInitialState('client-1', '田中一郎');
			const loadData: InitialScheduleData[] = [
				{ id: 'schedule-1', data: createTestScheduleData() },
				{
					id: 'schedule-2',
					data: createTestScheduleData({ weekday: 'Tue' }),
				},
			];

			const newState = editorReducer(initialState, {
				type: 'LOAD_SCHEDULES',
				payload: loadData,
			});

			expect(newState.schedules).toHaveLength(2);
			expect(newState.schedules[0].id).toBe('schedule-1');
			expect(newState.schedules[0].status).toBe('unchanged');
			expect(newState.schedules[0].originalId).toBe('schedule-1');
			expect(newState.schedules[1].id).toBe('schedule-2');
		});
	});

	describe('ADD_SCHEDULE', () => {
		it('新規スケジュールを追加し、new 状態で temp-xxx IDを付与する', () => {
			const initialState = createInitialState('client-1', '田中一郎');
			const newData = createTestScheduleData({ weekday: 'Wed' });

			const newState = editorReducer(initialState, {
				type: 'ADD_SCHEDULE',
				payload: newData,
			});

			expect(newState.schedules).toHaveLength(1);
			expect(newState.schedules[0].id).toMatch(/^temp-/);
			expect(newState.schedules[0].status).toBe('new');
			expect(newState.schedules[0].originalId).toBeUndefined();
			expect(newState.schedules[0].data).toEqual(newData);
			expect(newState.isFormOpen).toBe(false);
		});
	});

	describe('UPDATE_SCHEDULE', () => {
		it('既存スケジュールを更新し、modified 状態にする', () => {
			const schedule = createTestSchedule({
				id: 'schedule-1',
				originalId: 'schedule-1',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};
			const updatedData = createTestScheduleData({ note: '更新済み' });

			const newState = editorReducer(initialState, {
				type: 'UPDATE_SCHEDULE',
				payload: { id: 'schedule-1', data: updatedData },
			});

			expect(newState.schedules[0].status).toBe('modified');
			expect(newState.schedules[0].data.note).toBe('更新済み');
			expect(newState.isFormOpen).toBe(false);
		});

		it('new 状態のスケジュールを更新しても new のまま', () => {
			const schedule = createTestSchedule({
				id: 'temp-123',
				originalId: undefined,
				status: 'new',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};
			const updatedData = createTestScheduleData({ note: '更新済み' });

			const newState = editorReducer(initialState, {
				type: 'UPDATE_SCHEDULE',
				payload: { id: 'temp-123', data: updatedData },
			});

			expect(newState.schedules[0].status).toBe('new');
			expect(newState.schedules[0].data.note).toBe('更新済み');
		});

		it('存在しないIDの場合は何も変更しない', () => {
			const schedule = createTestSchedule({ id: 'schedule-1' });
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'UPDATE_SCHEDULE',
				payload: { id: 'non-existent', data: createTestScheduleData() },
			});

			expect(newState.schedules).toEqual(initialState.schedules);
		});
	});

	describe('DELETE_SCHEDULE', () => {
		it('既存スケジュールを削除状態にする', () => {
			const schedule = createTestSchedule({
				id: 'schedule-1',
				status: 'unchanged',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'DELETE_SCHEDULE',
				payload: 'schedule-1',
			});

			expect(newState.schedules[0].status).toBe('deleted');
		});

		it('new 状態のスケジュールを削除すると完全に除去する', () => {
			const schedule = createTestSchedule({
				id: 'temp-123',
				originalId: undefined,
				status: 'new',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'DELETE_SCHEDULE',
				payload: 'temp-123',
			});

			expect(newState.schedules).toHaveLength(0);
		});

		it('modified 状態のスケジュールを削除すると deleted になる', () => {
			const schedule = createTestSchedule({
				id: 'schedule-1',
				status: 'modified',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'DELETE_SCHEDULE',
				payload: 'schedule-1',
			});

			expect(newState.schedules[0].status).toBe('deleted');
		});
	});

	describe('RESTORE_SCHEDULE', () => {
		it('削除状態のスケジュールを modified に復元する', () => {
			const schedule = createTestSchedule({
				id: 'schedule-1',
				originalId: 'schedule-1',
				status: 'deleted',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'RESTORE_SCHEDULE',
				payload: 'schedule-1',
			});

			// 復元後は編集されているとみなす（元の状態に戻すには再ロードが必要）
			expect(newState.schedules[0].status).toBe('modified');
		});

		it('deleted 以外の状態には影響しない', () => {
			const schedule = createTestSchedule({
				id: 'schedule-1',
				status: 'unchanged',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'RESTORE_SCHEDULE',
				payload: 'schedule-1',
			});

			expect(newState.schedules[0].status).toBe('unchanged');
		});
	});

	describe('OPEN_FORM', () => {
		it('スケジュールIDなしでフォームを開く（新規追加用）', () => {
			const initialState = createInitialState('client-1', '田中一郎');

			const newState = editorReducer(initialState, {
				type: 'OPEN_FORM',
			});

			expect(newState.isFormOpen).toBe(true);
			expect(newState.selectedScheduleId).toBeNull();
		});

		it('スケジュールIDを指定してフォームを開く（編集用）', () => {
			const schedule = createTestSchedule({ id: 'schedule-1' });
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
			};

			const newState = editorReducer(initialState, {
				type: 'OPEN_FORM',
				payload: 'schedule-1',
			});

			expect(newState.isFormOpen).toBe(true);
			expect(newState.selectedScheduleId).toBe('schedule-1');
		});
	});

	describe('CLOSE_FORM', () => {
		it('フォームを閉じて選択状態をクリアする', () => {
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				isFormOpen: true,
				selectedScheduleId: 'schedule-1',
			};

			const newState = editorReducer(initialState, {
				type: 'CLOSE_FORM',
			});

			expect(newState.isFormOpen).toBe(false);
			expect(newState.selectedScheduleId).toBeNull();
		});
	});

	describe('SET_SAVING', () => {
		it('保存中フラグを設定する', () => {
			const initialState = createInitialState('client-1', '田中一郎');

			const savingState = editorReducer(initialState, {
				type: 'SET_SAVING',
				payload: true,
			});

			expect(savingState.isSaving).toBe(true);

			const notSavingState = editorReducer(savingState, {
				type: 'SET_SAVING',
				payload: false,
			});

			expect(notSavingState.isSaving).toBe(false);
		});
	});

	describe('RESET_STATE', () => {
		it('状態をリセットして新しいデータでリロードする', () => {
			const schedule = createTestSchedule({
				id: 'temp-123',
				status: 'new',
			});
			const initialState: EditorState = {
				...createInitialState('client-1', '田中一郎'),
				schedules: [schedule],
				isFormOpen: true,
				selectedScheduleId: 'temp-123',
				isSaving: true,
			};
			const newData: InitialScheduleData[] = [
				{ id: 'schedule-1', data: createTestScheduleData() },
			];

			const newState = editorReducer(initialState, {
				type: 'RESET_STATE',
				payload: newData,
			});

			expect(newState.schedules).toHaveLength(1);
			expect(newState.schedules[0].id).toBe('schedule-1');
			expect(newState.schedules[0].status).toBe('unchanged');
			expect(newState.isFormOpen).toBe(false);
			expect(newState.selectedScheduleId).toBeNull();
			expect(newState.isSaving).toBe(false);
		});
	});
});
