'use client';

import {
	StaffPickerDialog,
	type StaffPickerOption,
} from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { ServiceTypeIdSchema } from '@/models/valueObjects/serviceTypeId';
import { timeToMinutes } from '@/models/valueObjects/time';
import { stringToTimeObject, timeObjectToString } from '@/utils/date';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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

export type { ServiceTypeOption, StaffPickerOption };

export interface ScheduleEditFormModalProps {
	isOpen: boolean;
	weekday: DayOfWeek;
	serviceTypeOptions: ServiceTypeOption[];
	staffOptions: StaffPickerOption[];
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
	staffOptions,
	initialData,
	onClose,
	onSubmit,
}: ScheduleEditFormModalProps) => {
	const isEditMode = !!initialData;
	const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
		initialData?.staffIds[0] ?? null,
	);

	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<ScheduleEditFormValues>({
		resolver: zodResolver(ScheduleEditFormSchema),
		defaultValues: createDefaultValues(initialData),
	});

	// 現在選択されているサービス種別を監視
	const selectedServiceTypeId = watch('serviceTypeId');

	useEffect(() => {
		if (isOpen) {
			reset(createDefaultValues(initialData));

			setSelectedStaffId(initialData?.staffIds[0] ?? null);
		}
	}, [isOpen, initialData, reset]);

	// サービス種別が変更されたら、対応していないスタッフをクリア
	useEffect(() => {
		if (!selectedServiceTypeId || !selectedStaffId) return;
		const staff = staffOptions.find((s) => s.id === selectedStaffId);
		if (staff && !staff.serviceTypeIds.includes(selectedServiceTypeId)) {
			setSelectedStaffId(null);
		}
	}, [selectedServiceTypeId, selectedStaffId, staffOptions]);

	// Escapeキーでモーダルを閉じる
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	const handleFormSubmit = (values: ScheduleEditFormValues) => {
		const startTime = stringToTimeObject(values.startTime);
		const endTime = stringToTimeObject(values.endTime);

		if (!startTime || !endTime) return;

		const selectedStaff = staffOptions.find((s) => s.id === selectedStaffId);

		const scheduleData: ScheduleData = {
			weekday: initialData?.weekday ?? weekday,
			serviceTypeId: values.serviceTypeId,
			staffIds: selectedStaffId ? [selectedStaffId] : [],
			staffNames: selectedStaff ? [selectedStaff.name] : [],
			startTime,
			endTime,
			note: values.note || null,
		};

		onSubmit(scheduleData);
	};

	const handleStaffSelect = (staffId: string) => {
		setSelectedStaffId(staffId);
		setIsStaffPickerOpen(false);
	};

	const handleClearStaff = () => {
		setSelectedStaffId(null);
		setIsStaffPickerOpen(false);
	};

	const selectedStaffName =
		staffOptions.find((s) => s.id === selectedStaffId)?.name ?? '未選択';

	if (!isOpen) return null;

	return (
		<>
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

						{/* 担当者選択 */}
						<div className="form-control">
							<label className="label">
								<span className="label-text">担当者</span>
							</label>
							<button
								type="button"
								className="btn w-full btn-outline"
								onClick={() => setIsStaffPickerOpen(true)}
							>
								{selectedStaffName}
							</button>
						</div>

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

				<div className="modal-backdrop" onClick={onClose} role="presentation" />
			</div>

			<StaffPickerDialog
				isOpen={isStaffPickerOpen}
				staffOptions={staffOptions}
				selectedStaffId={selectedStaffId}
				onClose={() => setIsStaffPickerOpen(false)}
				onSelect={handleStaffSelect}
				onClear={handleClearStaff}
				requiredServiceTypeId={selectedServiceTypeId || undefined}
			/>
		</>
	);
};
