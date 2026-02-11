'use client';

import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { WeekdaySchema } from '@/models/basicScheduleActionSchemas';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { ServiceTypeIdSchema } from '@/models/valueObjects/serviceTypeId';
import { timeToMinutes } from '@/models/valueObjects/time';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { StaffPickerDialog } from '../StaffPickerDialog';
import { BasicScheduleFormContent } from './BasicScheduleFormContent';
import { TIME_PATTERN, getSubmitButtonClass, parseTimeString } from './helpers';
import { MODE_CONFIG } from './modeConfig';
import {
	useBasicScheduleFormSubmit,
	type BasicScheduleCallbackData,
} from './useBasicScheduleFormSubmit';
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
	/** clientId が固定の場合に指定。利用者選択フィールドを読み取り専用テキストで表示 */
	fixedClientId?: string;
	/** weekday が固定の場合に指定。曜日選択フィールドを読み取り専用テキストで表示 */
	fixedWeekday?: DayOfWeek;
	/** ServerAction 成功後のコールバック（ダイアログを閉じるなど） */
	onSubmitSuccess?: () => void;
	/** キャンセルボタンのコールバック（モーダル用） */
	onCancel?: () => void;
	/** コンテナ要素（section）を非表示にし、フォーム要素のみを表示（モーダル用） */
	asModal?: boolean;
	/** コールバックモード: Server Action を呼び出さず、バリデーション後にデータを返す */
	onFormSubmit?: (data: BasicScheduleCallbackData) => void;
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
	fixedClientId?: string,
	fixedWeekday?: DayOfWeek,
): BasicScheduleFormValues => {
	const base = {
		...DEFAULT_FORM_VALUES,
		...initialValues,
	};
	return {
		...base,
		clientId: fixedClientId ?? base.clientId,
		weekday: fixedWeekday ?? base.weekday,
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

export const BasicScheduleForm = ({
	serviceUsers,
	serviceTypes,
	staffs,
	initialValues,
	mode = 'create',
	scheduleId,
	fixedClientId,
	fixedWeekday,
	onSubmitSuccess,
	onCancel,
	asModal = false,
	onFormSubmit,
}: BasicScheduleFormProps) => {
	const isEditMode = mode === 'edit';
	const config = MODE_CONFIG[mode];

	// fixedClientId から利用者名を取得
	const fixedClientName = fixedClientId
		? (serviceUsers.find((u) => u.id === fixedClientId)?.name ?? '不明な利用者')
		: undefined;

	const formMethods = useForm<BasicScheduleFormValues>({
		resolver: zodResolver(BasicScheduleFormSchema),
		mode: 'onChange',
		defaultValues: buildDefaultValues(
			initialValues,
			fixedClientId,
			fixedWeekday,
		),
	});

	const {
		control,
		reset,
		setValue,
		trigger,
		formState: { isSubmitting, isValid },
		handleSubmit,
	} = formMethods;

	useEffect(() => {
		if (initialValues) {
			reset(buildDefaultValues(initialValues, fixedClientId, fixedWeekday));
			// reset 後に次のレンダリングサイクルでバリデーションを再実行して isValid を更新
			const timeoutId = setTimeout(() => {
				void trigger();
			}, 0);
			return () => clearTimeout(timeoutId);
		}
	}, [initialValues, fixedClientId, fixedWeekday, reset, trigger]);

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
		fixedWeekday,
		initialValues,
		reset,
		closeStaffPicker: staffSelection.closeStaffPicker,
		onSubmitSuccess,
		onFormSubmit,
	});

	const { isDeleting, handleDelete } = useDeleteSchedule({ scheduleId });

	const submitButtonClass = getSubmitButtonClass(isSubmitting);

	// フォームコンテンツ
	const formContent = (
		<FormProvider {...formMethods}>
			<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
				<BasicScheduleFormContent
					serviceUsers={serviceUsers}
					serviceTypes={serviceTypes}
					isEditMode={isEditMode}
					fixedClientId={fixedClientId}
					fixedClientName={fixedClientName}
					fixedWeekday={fixedWeekday}
					isSubmitting={isSubmitting}
					isValid={isValid}
					noteValue={noteValue}
					apiError={apiError}
					staffSelection={{
						selectedStaff: staffSelection.selectedStaff,
						staffStatusMessage: staffSelection.staffStatusMessage,
						staffPickerDisabled: staffSelection.staffPickerDisabled,
						staffClearDisabled: staffSelection.staffClearDisabled,
						openStaffPicker: staffSelection.openStaffPicker,
						handleStaffClear: staffSelection.handleStaffClear,
					}}
					submitButtonText={config.submitButtonText}
					submitButtonClass={submitButtonClass}
					isDeleting={isDeleting}
					onDelete={handleDelete}
					onCancel={onCancel}
				/>
			</form>
		</FormProvider>
	);

	// asModalがtrueの場合はコンテナとヘッダーを省略
	if (asModal) {
		return (
			<>
				{formContent}
				<StaffPickerDialog
					isOpen={staffSelection.isStaffPickerOpen}
					staffOptions={staffSelection.staffPickerOptions}
					selectedStaffId={selectedStaffId}
					onClose={staffSelection.closeStaffPicker}
					onSelect={staffSelection.handleStaffConfirm}
					onClear={staffSelection.staffPickerClearHandler}
				/>
			</>
		);
	}

	return (
		<section className="rounded-box border border-base-200 bg-base-100 p-6 shadow-sm">
			<header className="mb-6 space-y-1">
				<h2 className="text-2xl font-semibold">{config.headerTitle}</h2>
				<p className="text-sm text-base-content/70">
					{config.headerDescription}
				</p>
			</header>
			{formContent}
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
