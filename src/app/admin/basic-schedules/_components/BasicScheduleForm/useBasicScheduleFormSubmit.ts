import {
	createBasicScheduleAction,
	updateBasicScheduleAction,
} from '@/app/actions/basicSchedules';
import { createQuickServiceUserAction } from '@/app/actions/serviceUsers';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { TimeValue } from '@/models/valueObjects/time';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UseFormReset } from 'react-hook-form';
import type {
	BasicScheduleFormInitialValues,
	BasicScheduleFormMode,
	BasicScheduleFormValues,
} from './BasicScheduleForm';
import { parseTimeString, sanitizeNote } from './helpers';
import { MODE_CONFIG } from './modeConfig';

/**
 * コールバックモードで返されるスケジュールデータ
 */
export type BasicScheduleCallbackData = {
	weekday: DayOfWeek;
	serviceTypeId: ServiceTypeId;
	staffIds: string[];
	startTime: TimeValue;
	endTime: TimeValue;
	note: string | null;
};

type UseBasicScheduleFormSubmitParams = {
	mode: BasicScheduleFormMode;
	scheduleId?: string;
	initialValues?: BasicScheduleFormInitialValues;
	reset: UseFormReset<BasicScheduleFormValues>;
	onCreated?: (schedule: BasicScheduleRecord) => void;
	closeStaffPicker: () => void;
	/** ServerAction 成功後のコールバック（リダイレクトの代わりに呼び出される） */
	onSubmitSuccess?: () => void;
	/** コールバックモード: Server Action を呼び出さず、バリデーション後にデータを返す */
	onFormSubmit?: (data: BasicScheduleCallbackData) => void;
	/** コールバックモード用: weekday の固定値 */
	fixedWeekday?: DayOfWeek;
};

const buildDefaultValues = (
	initialValues?: BasicScheduleFormInitialValues,
): BasicScheduleFormValues => {
	const overrides: BasicScheduleFormInitialValues = initialValues ?? {};
	return {
		clientId: overrides.clientId ?? '',
		newClientName: overrides.newClientName ?? '',
		serviceTypeId: overrides.serviceTypeId ?? '',
		weekday: overrides.weekday ?? 'Mon',
		startTime: overrides.startTime ?? '',
		endTime: overrides.endTime ?? '',
		note: overrides.note ?? '',
		staffId: overrides.staffId ?? null,
	};
};

type ValidationResult =
	| {
			valid: true;
			start: TimeValue;
			end: TimeValue;
			serviceTypeId: ServiceTypeId;
	  }
	| { valid: false; error: string };

const validateFormValues = (
	values: BasicScheduleFormValues,
): ValidationResult => {
	const start = parseTimeString(values.startTime);
	const end = parseTimeString(values.endTime);
	if (!start || !end) {
		return { valid: false, error: '時刻の変換に失敗しました' };
	}
	if (!values.serviceTypeId) {
		return { valid: false, error: 'サービス区分を選択してください' };
	}
	return { valid: true, start, end, serviceTypeId: values.serviceTypeId };
};

type NewClientResult =
	| { success: true; clientId: string }
	| { success: false; error: string };

const createNewClientIfNeeded = async (
	values: BasicScheduleFormValues,
): Promise<NewClientResult> => {
	if (values.clientId !== 'new') {
		return { success: true, clientId: values.clientId };
	}

	const name = values.newClientName?.trim();
	if (!name) {
		return { success: false, error: '新規利用者の氏名を入力してください' };
	}

	const result = await createQuickServiceUserAction(name);
	return result.error || !result.data
		? { success: false, error: result.error ?? '利用者の作成に失敗しました' }
		: { success: true, clientId: result.data.id };
};

const buildCallbackData = (
	values: BasicScheduleFormValues,
	validation: {
		start: TimeValue;
		end: TimeValue;
		serviceTypeId: ServiceTypeId;
	},
	fixedWeekday?: DayOfWeek,
): BasicScheduleCallbackData => ({
	weekday: fixedWeekday ?? values.weekday,
	serviceTypeId: validation.serviceTypeId,
	staffIds: values.staffId ? [values.staffId] : [],
	startTime: validation.start,
	endTime: validation.end,
	note: sanitizeNote(values.note),
});

const buildPayload = (
	values: BasicScheduleFormValues,
	clientId: string,
	validation: {
		start: TimeValue;
		end: TimeValue;
		serviceTypeId: ServiceTypeId;
	},
) => ({
	client_id: clientId,
	service_type_id: validation.serviceTypeId,
	weekday: values.weekday,
	start_time: validation.start,
	end_time: validation.end,
	staff_ids: values.staffId ? [values.staffId] : [],
	note: sanitizeNote(values.note),
});

const executeAction = async (
	mode: BasicScheduleFormMode,
	scheduleId: string | undefined,
	payload: ReturnType<typeof buildPayload>,
) =>
	mode === 'edit' && scheduleId
		? updateBasicScheduleAction(scheduleId, payload)
		: createBasicScheduleAction(payload);

export const useBasicScheduleFormSubmit = ({
	mode,
	scheduleId,
	fixedWeekday,
	initialValues,
	reset,
	onCreated,
	closeStaffPicker,
	onSubmitSuccess,
	onFormSubmit,
}: UseBasicScheduleFormSubmitParams) => {
	const router = useRouter();
	const [apiError, setApiError] = useState<string | null>(null);
	const { handleActionResult } = useActionResultHandler();

	const onSubmit = async (values: BasicScheduleFormValues) => {
		setApiError(null);

		const validation = validateFormValues(values);
		if (!validation.valid) {
			setApiError(validation.error);
			return;
		}

		// コールバックモード: Server Action を呼び出さず、データを返す
		if (onFormSubmit) {
			onFormSubmit(buildCallbackData(values, validation, fixedWeekday));
			return;
		}

		const clientResult = await createNewClientIfNeeded(values);
		if (!clientResult.success) {
			setApiError(clientResult.error);
			return;
		}

		const payload = buildPayload(values, clientResult.clientId, validation);
		const result = await executeAction(mode, scheduleId, payload);

		const config = MODE_CONFIG[mode];
		const handled = handleActionResult(result, {
			successMessage: config.successMessage,
			errorMessage: config.errorMessage,
			onSuccess: (data) => {
				if (data) onCreated?.(data);
			},
		});

		if (!handled) {
			setApiError(result.error ?? '不明なエラーが発生しました');
			return;
		}

		reset(buildDefaultValues(initialValues));
		closeStaffPicker();

		if (onSubmitSuccess) {
			onSubmitSuccess();
		} else {
			router.push('/admin/basic-schedules');
		}
	};

	return {
		apiError,
		onSubmit,
	};
};
