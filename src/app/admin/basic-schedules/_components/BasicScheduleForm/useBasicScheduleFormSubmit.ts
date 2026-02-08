import {
	createBasicScheduleAction,
	updateBasicScheduleAction,
} from '@/app/actions/basicSchedules';
import { createQuickServiceUserAction } from '@/app/actions/serviceUsers';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
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

type UseBasicScheduleFormSubmitParams = {
	mode: BasicScheduleFormMode;
	scheduleId?: string;
	initialValues?: BasicScheduleFormInitialValues;
	reset: UseFormReset<BasicScheduleFormValues>;
	onCreated?: (schedule: BasicScheduleRecord) => void;
	closeStaffPicker: () => void;
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
	| { valid: true; start: string; end: string }
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
	return { valid: true, start, end };
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

	if (!values.newClientName?.trim()) {
		return { success: false, error: '新規利用者の氏名を入力してください' };
	}

	const result = await createQuickServiceUserAction(
		values.newClientName.trim(),
	);
	if (result.error || !result.data) {
		return {
			success: false,
			error: result.error ?? '利用者の作成に失敗しました',
		};
	}
	return { success: true, clientId: result.data.id };
};

export const useBasicScheduleFormSubmit = ({
	mode,
	scheduleId,
	initialValues,
	reset,
	onCreated,
	closeStaffPicker,
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

		const clientResult = await createNewClientIfNeeded(values);
		if (!clientResult.success) {
			setApiError(clientResult.error);
			return;
		}

		const payload = {
			client_id: clientResult.clientId,
			service_type_id: values.serviceTypeId,
			weekday: values.weekday,
			start_time: validation.start,
			end_time: validation.end,
			staff_ids: values.staffId ? [values.staffId] : [],
			note: sanitizeNote(values.note),
		};

		const result =
			mode === 'edit' && scheduleId
				? await updateBasicScheduleAction(scheduleId, payload)
				: await createBasicScheduleAction(payload);

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
		router.push('/admin/basic-schedules');
	};

	return {
		apiError,
		onSubmit,
	};
};
