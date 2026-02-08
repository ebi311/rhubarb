'use client';

import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { ServiceTypeIdSchema } from '@/models/valueObjects/serviceTypeId';
import { timeToMinutes } from '@/models/valueObjects/time';
import { stringToTimeObject, timeObjectToString } from '@/utils/date';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ScheduleData } from '../ClientWeeklyScheduleEditor/types';
import {
	ScheduleFormFields,
	type ServiceTypeOption,
} from './ScheduleFormFields';

const TIME_PATTERN = /^\d{2}:\d{2}$/;

const ScheduleEditFormSchema = z
	.object({
		serviceTypeId: ServiceTypeIdSchema,
		startTime: z
			.string()
			.min(1, '開始時刻を入力してください')
			.regex(TIME_PATTERN, '開始時刻はHH:MM形式で入力してください'),
		endTime: z
			.string()
			.min(1, '終了時刻を入力してください')
			.regex(TIME_PATTERN, '終了時刻はHH:MM形式で入力してください'),
		note: z.string().max(500, '備考は500文字以内で入力してください').optional(),
	})
	.superRefine((values, ctx) => {
		const start = stringToTimeObject(values.startTime);
		const end = stringToTimeObject(values.endTime);
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

type ScheduleEditFormValues = z.infer<typeof ScheduleEditFormSchema>;

export type { ServiceTypeOption };

export interface ScheduleEditFormModalProps {
	isOpen: boolean;
	weekday: DayOfWeek;
	serviceTypeOptions: ServiceTypeOption[];
	initialData?: ScheduleData;
	onClose: () => void;
	onSubmit: (data: ScheduleData) => void;
}

const createDefaultValues = (
	initialData?: ScheduleData,
): ScheduleEditFormValues => ({
	serviceTypeId: initialData?.serviceTypeId ?? ('' as ServiceTypeId),
	startTime: initialData ? timeObjectToString(initialData.startTime) : '',
	endTime: initialData ? timeObjectToString(initialData.endTime) : '',
	note: initialData?.note ?? '',
});

export const ScheduleEditFormModal = ({
	isOpen,
	weekday,
	serviceTypeOptions,
	initialData,
	onClose,
	onSubmit,
}: ScheduleEditFormModalProps) => {
	const isEditMode = !!initialData;

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<ScheduleEditFormValues>({
		resolver: zodResolver(ScheduleEditFormSchema),
		defaultValues: createDefaultValues(initialData),
	});

	useEffect(() => {
		if (isOpen) {
			reset(createDefaultValues(initialData));
		}
	}, [isOpen, initialData, reset]);

	const handleFormSubmit = (values: ScheduleEditFormValues) => {
		const startTime = stringToTimeObject(values.startTime);
		const endTime = stringToTimeObject(values.endTime);

		if (!startTime || !endTime) return;

		const scheduleData: ScheduleData = {
			weekday: initialData?.weekday ?? weekday,
			serviceTypeId: values.serviceTypeId,
			staffIds: initialData?.staffIds ?? [],
			staffNames: initialData?.staffNames ?? [],
			startTime,
			endTime,
			note: values.note || null,
		};

		onSubmit(scheduleData);
	};

	if (!isOpen) return null;

	return (
		<div className="modal-open modal" role="dialog" aria-modal="true">
			<div className="modal-box">
				<h3 className="mb-4 text-lg font-bold">
					{isEditMode ? '予定を編集' : '予定を追加'}
				</h3>

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					<ScheduleFormFields
						register={register}
						errors={errors}
						serviceTypeOptions={serviceTypeOptions}
					/>

					<div className="modal-action">
						<button type="button" className="btn btn-ghost" onClick={onClose}>
							キャンセル
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={isSubmitting}
						>
							反映
						</button>
					</div>
				</form>
			</div>

			<div
				className="modal-backdrop"
				onClick={onClose}
				onKeyDown={(e) => e.key === 'Escape' && onClose()}
				role="presentation"
			/>
		</div>
	);
};
