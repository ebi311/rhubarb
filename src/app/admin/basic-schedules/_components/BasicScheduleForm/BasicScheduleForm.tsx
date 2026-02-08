'use client';

import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { WeekdaySchema } from '@/models/basicScheduleActionSchemas';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { ServiceTypeIdSchema } from '@/models/valueObjects/serviceTypeId';
import { timeToMinutes } from '@/models/valueObjects/time';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { StaffPickerDialog } from '../StaffPickerDialog';
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
	getSubmitButtonClass,
	parseTimeString,
	shouldDisableSubmitButton,
} from './helpers';
import { MODE_CONFIG } from './modeConfig';
import { StaffSelectionSummary } from './StaffSelectionSummary';
import { useBasicScheduleFormSubmit } from './useBasicScheduleFormSubmit';
import { useBasicScheduleWatchValues } from './useBasicScheduleWatchValues';
import { useDeleteSchedule } from './useDeleteSchedule';
import { useStaffSelection } from './useStaffSelection';

const BasicScheduleFormSchema = z
	.object({
		clientId: z
			.uuid({ error: '利用者を選択してください' })
			.or(z.literal('new')),
		newClientName: z.string().optional(),
		serviceTypeId: ServiceTypeIdSchema.or(z.literal('')),
		weekday: WeekdaySchema,
		startTime: z
			.string()
			.min(1, { message: '開始時刻を入力してください' })
			.regex(TIME_PATTERN, '開始時刻はHH:MM形式で入力してください'),
		endTime: z
			.string()
			.min(1, { message: '終了時刻を入力してください' })
			.regex(TIME_PATTERN, '終了時刻はHH:MM形式で入力してください'),
		note: z
			.string()
			.max(500, { message: '備考は500文字以内で入力してください' })
			.optional(),
		staffId: z
			.uuid('担当者IDはUUID形式で指定してください')
			.nullable()
			.optional(),
	})
	.superRefine((values, ctx) => {
		// 新規利用者選択時は氏名必須
		if (values.clientId === 'new') {
			const name = values.newClientName?.trim();
			if (!name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['newClientName'],
					message: '新規利用者の氏名を入力してください',
				});
			} else if (name.length > 100) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['newClientName'],
					message: '氏名は100文字以内で入力してください',
				});
			}
		}
		if (!values.serviceTypeId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['serviceTypeId'],
				message: 'サービス区分を選択してください',
			});
		}
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
		| 'clientId'
		| 'newClientName'
		| 'serviceTypeId'
		| 'weekday'
		| 'startTime'
		| 'endTime'
		| 'note'
		| 'staffId'
	>
>;

export type BasicScheduleFormMode = 'create' | 'edit';

export type BasicScheduleFormProps = {
	serviceUsers: ServiceUser[];
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
	initialValues?: BasicScheduleFormInitialValues;
	mode?: BasicScheduleFormMode;
	scheduleId?: string;
};

const DEFAULT_FORM_VALUES: BasicScheduleFormValues = {
	clientId: '',
	newClientName: '',
	serviceTypeId: '',
	weekday: 'Mon',
	startTime: '',
	endTime: '',
	note: '',
	staffId: null,
};

const buildDefaultValues = (
	initialValues?: BasicScheduleFormInitialValues,
): BasicScheduleFormValues => ({
	...DEFAULT_FORM_VALUES,
	...initialValues,
	newClientName: initialValues?.newClientName ?? '',
	note: initialValues?.note ?? '',
	staffId: initialValues?.staffId ?? null,
});

const WATCH_VALUE_DEFAULTS: Pick<
	BasicScheduleFormValues,
	'clientId' | 'serviceTypeId' | 'staffId' | 'note'
> = {
	clientId: DEFAULT_FORM_VALUES.clientId,
	serviceTypeId: DEFAULT_FORM_VALUES.serviceTypeId,
	staffId: DEFAULT_FORM_VALUES.staffId,
	note: DEFAULT_FORM_VALUES.note,
};

export const BasicScheduleForm = ({
	serviceUsers,
	serviceTypes,
	staffs,
	initialValues,
	mode = 'create',
	scheduleId,
}: BasicScheduleFormProps) => {
	const isEditMode = mode === 'edit';
	const config = MODE_CONFIG[mode];

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

	const { serviceTypeId, selectedStaffId, noteValue } =
		useBasicScheduleWatchValues(control, WATCH_VALUE_DEFAULTS);

	const staffSelection = useStaffSelection({
		staffs,
		serviceTypeId,
		selectedStaffId,
		setValue,
		isSubmitting,
	});

	const { apiError, onSubmit } = useBasicScheduleFormSubmit({
		mode,
		scheduleId,
		initialValues,
		reset,
		closeStaffPicker: staffSelection.closeStaffPicker,
	});

	const { isDeleting, handleDelete } = useDeleteSchedule({ scheduleId });

	const submitButtonClass = getSubmitButtonClass(isSubmitting);
	const isSubmitDisabled = shouldDisableSubmitButton(isValid, isSubmitting);

	return (
		<section className="rounded-box border border-base-200 bg-base-100 p-6 shadow-sm">
			<header className="mb-6 space-y-1">
				<h2 className="text-2xl font-semibold">{config.headerTitle}</h2>
				<p className="text-sm text-base-content/70">
					{config.headerDescription}
				</p>
			</header>
			<FormProvider {...formMethods}>
				<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
					<div className="flex flex-col gap-4">
						<ClientSelectField
							serviceUsers={serviceUsers}
							disabled={isEditMode}
						/>
						<ServiceTypeSelectField serviceTypes={serviceTypes} />
						<WeekdayField />
						<div className="flex items-baseline gap-4">
							<TimeField name="startTime" label="開始時刻" />
							<span>〜</span>
							<TimeField name="endTime" label="終了時刻" />
						</div>

						<div className="space-y-2">
							<div className="fieldset flex flex-col gap-2">
								<div className="flex flex-col items-start justify-center gap-3">
									<div>
										<p className="fieldset-legend">デフォルト担当者</p>
										<p className="text-sm text-base-content/70">
											{staffSelection.staffStatusMessage}
										</p>
									</div>
									<StaffSelectionSummary staff={staffSelection.selectedStaff} />
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											className="btn btn-sm"
											onClick={staffSelection.openStaffPicker}
											disabled={staffSelection.staffPickerDisabled}
										>
											担当者を選択
										</button>
										<button
											type="button"
											className="btn btn-ghost btn-sm"
											onClick={staffSelection.handleStaffClear}
											disabled={staffSelection.staffClearDisabled}
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

					<div className="flex justify-between">
						{isEditMode ? (
							<button
								type="button"
								className="btn btn-outline btn-error"
								onClick={handleDelete}
								disabled={isDeleting || isSubmitting}
							>
								{isDeleting ? '削除中...' : '削除する'}
							</button>
						) : (
							<div />
						)}
						<button
							type="submit"
							className={submitButtonClass}
							disabled={isSubmitDisabled}
						>
							{config.submitButtonText}
						</button>
					</div>
				</form>
			</FormProvider>

			<StaffPickerDialog
				isOpen={staffSelection.isStaffPickerOpen}
				staffOptions={staffSelection.staffPickerOptions}
				selectedStaffId={selectedStaffId}
				onClose={staffSelection.closeStaffPicker}
				onSelect={staffSelection.handleStaffConfirm}
				onClear={staffSelection.staffPickerClearHandler}
			/>
		</section>
	);
};
