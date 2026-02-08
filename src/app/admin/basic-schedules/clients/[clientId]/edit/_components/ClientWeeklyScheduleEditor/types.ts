import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { TimeValue } from '@/models/valueObjects/time';

/**
 * 編集状態を表す型
 * - unchanged: 変更なし（初期状態）
 * - new: 新規追加
 * - modified: 変更あり
 * - deleted: 削除済み
 */
export type EditStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

/**
 * スケジュールのデータ部分
 */
export type ScheduleData = {
	weekday: DayOfWeek;
	serviceTypeId: ServiceTypeId;
	staffIds: string[];
	staffNames: string[];
	startTime: TimeValue;
	endTime: TimeValue;
	note: string | null;
};

/**
 * 編集可能なスケジュール
 */
export type EditableSchedule = {
	/** 一意識別子（新規は temp-xxx 形式） */
	id: string;
	/** 既存データの元のID（新規はundefined） */
	originalId?: string;
	/** 編集状態 */
	status: EditStatus;
	/** スケジュールデータ */
	data: ScheduleData;
};

/**
 * エディタ全体の状態
 */
export type EditorState = {
	clientId: string;
	clientName: string;
	schedules: EditableSchedule[];
	selectedScheduleId: string | null;
	isFormOpen: boolean;
	isSaving: boolean;
};

/**
 * エディタのアクション型
 */
export type EditorAction =
	| { type: 'LOAD_SCHEDULES'; payload: InitialScheduleData[] }
	| { type: 'ADD_SCHEDULE'; payload: ScheduleData }
	| { type: 'UPDATE_SCHEDULE'; payload: { id: string; data: ScheduleData } }
	| { type: 'DELETE_SCHEDULE'; payload: string }
	| { type: 'RESTORE_SCHEDULE'; payload: string }
	| { type: 'OPEN_FORM'; payload?: string }
	| { type: 'CLOSE_FORM' }
	| { type: 'SET_SAVING'; payload: boolean }
	| { type: 'RESET_STATE'; payload: InitialScheduleData[] };

/**
 * 初期データのロード用型
 */
export type InitialScheduleData = {
	id: string;
	data: ScheduleData;
};
