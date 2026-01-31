import {
	createBasicScheduleAction,
	updateBasicScheduleAction,
} from '@/app/actions/basicSchedules';
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
		serviceTypeId: overrides.serviceTypeId ?? '',
		weekday: overrides.weekday ?? 'Mon',
		startTime: overrides.startTime ?? '',
		endTime: overrides.endTime ?? '',
		note: overrides.note ?? '',
		staffId: overrides.staffId ?? null,
	};
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

		const start = parseTimeString(values.startTime);
		const end = parseTimeString(values.endTime);
		if (!start || !end) {
			setApiError('時刻の変換に失敗しました');
			return;
		}
		if (!values.serviceTypeId) {
			setApiError('サービス区分を選択してください');
			return;
		}

		const payload = {
			client_id: values.clientId,
			service_type_id: values.serviceTypeId,
			weekday: values.weekday,
			start_time: start,
			end_time: end,
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
