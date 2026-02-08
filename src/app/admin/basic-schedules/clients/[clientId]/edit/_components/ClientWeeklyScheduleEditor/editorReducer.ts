import type {
	EditableSchedule,
	EditorAction,
	EditorState,
	InitialScheduleData,
	ScheduleData,
} from './types';

/**
 * 一時IDを生成する
 */
const generateTempId = (): string => `temp-${crypto.randomUUID()}`;

/**
 * 初期データから EditableSchedule を作成する
 */
const createScheduleFromInitialData = (
	data: InitialScheduleData,
): EditableSchedule => ({
	id: data.id,
	originalId: data.id,
	status: 'unchanged',
	data: data.data,
});

/**
 * 初期状態を作成する
 */
export const createInitialState = (
	clientId: string,
	clientName: string,
): EditorState => ({
	clientId,
	clientName,
	schedules: [],
	selectedScheduleId: null,
	isFormOpen: false,
	isSaving: false,
});

// --- Action Handlers ---

const handleLoadSchedules = (
	state: EditorState,
	payload: InitialScheduleData[],
): EditorState => ({
	...state,
	schedules: payload.map(createScheduleFromInitialData),
});

const handleAddSchedule = (
	state: EditorState,
	payload: ScheduleData,
): EditorState => {
	const newSchedule: EditableSchedule = {
		id: generateTempId(),
		originalId: undefined,
		status: 'new',
		data: payload,
	};
	return {
		...state,
		schedules: [...state.schedules, newSchedule],
		isFormOpen: false,
		selectedScheduleId: null,
	};
};

const handleUpdateSchedule = (
	state: EditorState,
	payload: { id: string; data: ScheduleData },
): EditorState => {
	const { id, data } = payload;
	return {
		...state,
		schedules: state.schedules.map((schedule) => {
			if (schedule.id !== id) return schedule;
			const newStatus = schedule.status === 'new' ? 'new' : 'modified';
			return { ...schedule, status: newStatus, data };
		}),
		isFormOpen: false,
		selectedScheduleId: null,
	};
};

const handleDeleteSchedule = (
	state: EditorState,
	scheduleId: string,
): EditorState => {
	const targetSchedule = state.schedules.find((s) => s.id === scheduleId);
	if (!targetSchedule) return state;

	if (targetSchedule.status === 'new') {
		return {
			...state,
			schedules: state.schedules.filter((s) => s.id !== scheduleId),
		};
	}

	return {
		...state,
		schedules: state.schedules.map((schedule) =>
			schedule.id === scheduleId
				? { ...schedule, status: 'deleted' as const }
				: schedule,
		),
	};
};

const handleRestoreSchedule = (
	state: EditorState,
	scheduleId: string,
): EditorState => ({
	...state,
	schedules: state.schedules.map((schedule) => {
		if (schedule.id !== scheduleId) return schedule;
		if (schedule.status !== 'deleted') return schedule;
		return { ...schedule, status: 'modified' as const };
	}),
});

const handleOpenForm = (
	state: EditorState,
	scheduleId?: string,
): EditorState => ({
	...state,
	isFormOpen: true,
	selectedScheduleId: scheduleId ?? null,
});

const handleCloseForm = (state: EditorState): EditorState => ({
	...state,
	isFormOpen: false,
	selectedScheduleId: null,
});

const handleSetSaving = (
	state: EditorState,
	isSaving: boolean,
): EditorState => ({
	...state,
	isSaving,
});

const handleResetState = (
	state: EditorState,
	payload: InitialScheduleData[],
): EditorState => ({
	...state,
	schedules: payload.map(createScheduleFromInitialData),
	isFormOpen: false,
	selectedScheduleId: null,
	isSaving: false,
});

/**
 * エディタの状態管理Reducer
 */
export const editorReducer = (
	state: EditorState,
	action: EditorAction,
): EditorState => {
	switch (action.type) {
		case 'LOAD_SCHEDULES':
			return handleLoadSchedules(state, action.payload);
		case 'ADD_SCHEDULE':
			return handleAddSchedule(state, action.payload);
		case 'UPDATE_SCHEDULE':
			return handleUpdateSchedule(state, action.payload);
		case 'DELETE_SCHEDULE':
			return handleDeleteSchedule(state, action.payload);
		case 'RESTORE_SCHEDULE':
			return handleRestoreSchedule(state, action.payload);
		case 'OPEN_FORM':
			return handleOpenForm(state, action.payload);
		case 'CLOSE_FORM':
			return handleCloseForm(state);
		case 'SET_SAVING':
			return handleSetSaving(state, action.payload);
		case 'RESET_STATE':
			return handleResetState(state, action.payload);
		default:
			return state;
	}
};
