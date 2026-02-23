import {
	addJstDays,
	formatJstDateString,
	parseJstDateString,
	stringToTimeObject,
} from '@/utils/date';

export type AdjustmentType = 'staff_absence' | 'client_datetime_change';

export const ACTION_ERROR_MESSAGE = '処理できませんでした。';

export const NETWORK_ERROR_MESSAGE =
	'提案の取得に失敗しました。通信状況を確認して再度お試しください。';

export const DEFAULT_START_TIME = '09:00';

export const DEFAULT_END_TIME = '10:00';

export const toDateInputString = (
	value: string,
	offsetDays: number,
	fallback: string,
) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return fallback;
	}
	return formatJstDateString(addJstDays(parseJstDateString(value), offsetDays));
};

export const toOptionalMemo = (memo: string) => {
	const trimmedMemo = memo.trim();
	return trimmedMemo ? trimmedMemo : undefined;
};

export const validateStaffAbsenceRange = (
	startDateStr: string,
	endDateStr: string,
) => {
	if (startDateStr > endDateStr) {
		return '開始日は終了日以前を指定してください。';
	}
	return null;
};

export const validateClientDatetimeChangeTimes = (
	newStartTime: string,
	newEndTime: string,
) => {
	const parsedStartTime = stringToTimeObject(newStartTime);
	const parsedEndTime = stringToTimeObject(newEndTime);
	if (!parsedStartTime || !parsedEndTime) {
		return {
			isValid: false as const,
			errorMessage: '時刻の形式が不正です。HH:mm 形式で入力してください。',
		};
	}
	const startTotalMinutes = parsedStartTime.hour * 60 + parsedStartTime.minute;
	const endTotalMinutes = parsedEndTime.hour * 60 + parsedEndTime.minute;
	if (startTotalMinutes >= endTotalMinutes) {
		return {
			isValid: false as const,
			errorMessage: '開始時刻は終了時刻より前を指定してください。',
		};
	}
	return {
		isValid: true as const,
		parsedStartTime,
		parsedEndTime,
	};
};
