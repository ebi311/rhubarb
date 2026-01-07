'use client';

import { createBasicScheduleAction } from '@/app/actions/basicSchedules';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import { WeekdaySchema } from '@/models/basicScheduleActionSchemas';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { timeToMinutes } from '@/models/valueObjects/time';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import { FormProvider, useForm, type SubmitHandler, type UseFormReset } from 'react-hook-form';
import { z } from 'zod';
import { StaffPickerDialog, type StaffPickerOption } from '../StaffPickerDialog';
import {
	ClientSelectField,
	NoteField,
	ServiceTypeSelectField,
	TimeField,
	WeekdayField,
} from './FormControls';
import { ApiErrorMessage } from './FormMessages';
import {
	TIME_PATTERN,
	computeAllowedStaffIds,
	createServiceTypeNameMap,
	createStaffMap,
	getSelectedStaff,
	getStaffStatusMessage,
	getSubmitButtonClass,
	mapStaffPickerOptions,
	parseTimeString,
	resolveStaffPickerClearHandler,
	sanitizeNote,
	shouldDisableClearButton,
	shouldDisableStaffPickerButton,
	shouldDisableSubmitButton,
} from './helpers';
import { StaffSelectionSummary } from './StaffSelectionSummary';
import { useBasicScheduleWatchValues } from './useBasicScheduleWatchValues';

const BasicScheduleFormSchema = z
	.object({
		clientId: z.uuid({ error: '利用者を選択してください' }),
		serviceTypeId: z.uuid({ error: 'サービス区分を選択してください' }),
		weekday: WeekdaySchema,
		startTime: z
			.string()
			.min(1, { message: '開始時刻を入力してください' })
			.regex(TIME_PATTERN, '開始時刻はHH:MM形式で入力してください'),
		endTime: z
			.string()
			.min(1, { message: '終了時刻を入力してください' })
			.regex(TIME_PATTERN, '終了時刻はHH:MM形式で入力してください'),
		note: z.string().max(500, { message: '備考は500文字以内で入力してください' }).optional(),
		staffId: z.uuid('担当者IDはUUID形式で指定してください').nullable().optional(),
	})
	.superRefine((values, ctx) => {
		const start = parseTimeString(values.startTime);
		const end = parseTimeString(values.endTime);
		if (start && end) {
			if (timeToMinutes(start) >= timeToMinutes(end)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['endTime'],
					message: '終了時刻は開始時刻より後に設定してください',
				});
			}
		}
	});

export type BasicScheduleFormValues = z.infer<typeof BasicScheduleFormSchema>;

export type BasicScheduleFormInitialValues = Partial<
	Pick<
		BasicScheduleFormValues,
		'clientId' | 'serviceTypeId' | 'weekday' | 'startTime' | 'endTime' | 'note' | 'staffId'
	>
>;

export type BasicScheduleFormProps = {
	serviceUsers: ServiceUser[];
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
	initialValues?: BasicScheduleFormInitialValues;
};

const DEFAULT_FORM_VALUES: BasicScheduleFormValues = {
	clientId: '',
	serviceTypeId: '',
	weekday: 'Mon',
	startTime: '',
	endTime: '',
	note: '',
	staffId: null,
};

const buildDefaultValues = (
	initialValues?: BasicScheduleFormInitialValues,
): BasicScheduleFormValues => {
	const overrides: BasicScheduleFormInitialValues = initialValues ?? {};
	return {
		...DEFAULT_FORM_VALUES,
		...overrides,
		note: overrides.note ?? '',
		staffId: overrides.staffId ?? null,
	};
};

const WATCH_VALUE_DEFAULTS: Pick<
	BasicScheduleFormValues,
	'clientId' | 'serviceTypeId' | 'staffId' | 'note'
> = {
	clientId: DEFAULT_FORM_VALUES.clientId,
	serviceTypeId: DEFAULT_FORM_VALUES.serviceTypeId,
	staffId: DEFAULT_FORM_VALUES.staffId,
	note: DEFAULT_FORM_VALUES.note,
};

type SubmitHandlerDeps = {
	setApiError: (message: string | null) => void;
	handleActionResult: ReturnType<typeof useActionResultHandler>['handleActionResult'];
	reset: UseFormReset<BasicScheduleFormValues>;
	initialValues?: BasicScheduleFormInitialValues;
	onCreated?: (schedule: BasicScheduleRecord) => void;
	setStaffPickerOpen: Dispatch<SetStateAction<boolean>>;
};

const createOnSubmit = ({
	setApiError,
	handleActionResult,
	reset,
	initialValues,
	onCreated,
	setStaffPickerOpen,
}: SubmitHandlerDeps): SubmitHandler<BasicScheduleFormValues> => {
	return async (values) => {
		setApiError(null);
		const start = parseTimeString(values.startTime);
		const end = parseTimeString(values.endTime);
		if (!start || !end) {
			setApiError('時刻の変換に失敗しました');
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

		const result = await createBasicScheduleAction(payload);
		const handled = handleActionResult(result, {
			successMessage: '基本スケジュールを登録しました',
			errorMessage: '基本スケジュールの登録に失敗しました',
			onSuccess: (data) => {
				if (data) onCreated?.(data);
			},
		});

		if (!handled) {
			setApiError(result.error ?? '不明なエラーが発生しました');
			return;
		}

		reset(buildDefaultValues(initialValues));
		setStaffPickerOpen(false);
	};
};

export const BasicScheduleForm = ({
	serviceUsers,
	serviceTypes,
	staffs,
	initialValues,
}: BasicScheduleFormProps) => {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isStaffPickerOpen, setStaffPickerOpen] = useState(false);
	const { handleActionResult } = useActionResultHandler();

	const formMethods = useForm<BasicScheduleFormValues>({
		resolver: zodResolver(BasicScheduleFormSchema),
		mode: 'onChange',
		defaultValues: buildDefaultValues(initialValues),
	});

	const {
		control,
		reset,
		setValue,
		formState: { isSubmitting, isValid },
		handleSubmit,
	} = formMethods;

	useEffect(() => {
		if (initialValues) {
			reset(buildDefaultValues(initialValues));
		}
	}, [initialValues, reset]);

	const { serviceTypeId, selectedStaffId, noteValue } = useBasicScheduleWatchValues(
		control,
		WATCH_VALUE_DEFAULTS,
	);

	const serviceTypeNameMap = useMemo(() => createServiceTypeNameMap(serviceTypes), [serviceTypes]);

	const staffMap = useMemo(() => createStaffMap(staffs), [staffs]);

	const allowedStaffIds = useMemo(
		() => computeAllowedStaffIds(staffs, serviceTypeId),
		[staffs, serviceTypeId],
	);

	const staffPickerOptions: StaffPickerOption[] = useMemo(
		() => mapStaffPickerOptions(staffs, allowedStaffIds, serviceTypeNameMap),
		[staffs, allowedStaffIds, serviceTypeNameMap],
	);

	useEffect(() => {
		if (selectedStaffId && !allowedStaffIds.has(selectedStaffId)) {
			setValue('staffId', null);
		}
	}, [allowedStaffIds, selectedStaffId, setValue]);

	const selectedStaff = useMemo(
		() => getSelectedStaff(staffMap, selectedStaffId),
		[staffMap, selectedStaffId],
	);

	const staffStatusMessage = useMemo(
		() => getStaffStatusMessage(serviceTypeId, staffPickerOptions.length),
		[serviceTypeId, staffPickerOptions.length],
	);
	const canOpenStaffPicker = Boolean(serviceTypeId);

	const handleStaffConfirm = useCallback(
		(staffId: string) => {
			setValue('staffId', staffId, { shouldValidate: true });
			setStaffPickerOpen(false);
		},
		[setValue],
	);

	const handleStaffClear = useCallback(() => {
		setValue('staffId', null, { shouldValidate: true });
	}, [setValue]);

	const hasSelectedStaff = Boolean(selectedStaff);
	const staffPickerDisabled = shouldDisableStaffPickerButton(canOpenStaffPicker, isSubmitting);
	const staffClearDisabled = shouldDisableClearButton(hasSelectedStaff, isSubmitting);
	const submitButtonClass = getSubmitButtonClass(isSubmitting);
	const isSubmitDisabled = shouldDisableSubmitButton(isValid, isSubmitting);
	const staffPickerClearHandler = resolveStaffPickerClearHandler(selectedStaff, handleStaffClear);

	const onSubmit = handleSubmit(
		createOnSubmit({
			setApiError,
			handleActionResult,
			reset,
			initialValues,
			setStaffPickerOpen,
		}),
	);

	return (
		<section className="rounded-box border border-base-200 bg-base-100 p-6 shadow-sm">
			<header className="mb-6 space-y-1">
				<h2 className="text-2xl font-semibold">新規基本スケジュール</h2>
				<p className="text-sm text-base-content/70">
					必要な情報を入力し、「スケジュールを登録」を押してください。
				</p>
			</header>
			<FormProvider {...formMethods}>
				<form className="space-y-6" onSubmit={onSubmit}>
					<div className="flex flex-col gap-4">
						<ClientSelectField serviceUsers={serviceUsers} />
						<ServiceTypeSelectField serviceTypes={serviceTypes} />
						<WeekdayField />
						<div className="flex items-baseline gap-4">
							<TimeField name="startTime" label="開始時刻" />
							<span>〜</span>
							<TimeField name="endTime" label="終了時刻" />
						</div>

						<div className="space-y-2">
							<div className="flex flex-col gap-2 fieldset">
								<div className="flex flex-col items-start justify-center gap-3">
									<div>
										<p className="fieldset-legend">デフォルト担当者</p>
										<p className="text-sm text-base-content/70">{staffStatusMessage}</p>
									</div>
									<StaffSelectionSummary staff={selectedStaff} />
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											className="btn btn-sm"
											onClick={() => setStaffPickerOpen(true)}
											disabled={staffPickerDisabled}
										>
											担当者を選択
										</button>
										<button
											type="button"
											className="btn btn-sm btn-ghost"
											onClick={handleStaffClear}
											disabled={staffClearDisabled}
										>
											クリア
										</button>
									</div>
								</div>
							</div>
						</div>

						<NoteField valueLength={noteValue.length} />

						<ApiErrorMessage message={apiError} />
					</div>
					<div className="flex justify-end">
						<button type="submit" className={submitButtonClass} disabled={isSubmitDisabled}>
							スケジュールを登録
						</button>
					</div>
				</form>
			</FormProvider>

			<StaffPickerDialog
				isOpen={isStaffPickerOpen}
				staffOptions={staffPickerOptions}
				selectedStaffId={selectedStaffId}
				onClose={() => setStaffPickerOpen(false)}
				onSelect={handleStaffConfirm}
				onClear={staffPickerClearHandler}
			/>
		</section>
	);
};
