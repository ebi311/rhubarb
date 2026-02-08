'use client';

import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

export interface ServiceTypeOption {
	id: ServiceTypeId;
	name: string;
}

export interface ScheduleFormFieldValues {
	serviceTypeId: ServiceTypeId;
	startTime: string;
	endTime: string;
	note?: string;
}

export interface ScheduleFormFieldsProps {
	register: UseFormRegister<ScheduleFormFieldValues>;
	errors: FieldErrors<ScheduleFormFieldValues>;
	serviceTypeOptions: ServiceTypeOption[];
}

export const ScheduleFormFields = ({
	register,
	errors,
	serviceTypeOptions,
}: ScheduleFormFieldsProps) => (
	<>
		{/* サービス区分 */}
		<div className="form-control">
			<label className="label" htmlFor="serviceTypeId">
				<span className="label-text">サービス区分</span>
			</label>
			<select
				id="serviceTypeId"
				className={`select-bordered select w-full ${errors.serviceTypeId ? 'select-error' : ''}`}
				aria-label="サービス区分"
				{...register('serviceTypeId')}
			>
				<option value="">選択してください</option>
				{serviceTypeOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.name}
					</option>
				))}
			</select>
			{errors.serviceTypeId && (
				<label className="label">
					<span className="label-text-alt text-error">
						{errors.serviceTypeId.message}
					</span>
				</label>
			)}
		</div>

		{/* 開始時刻 */}
		<div className="form-control">
			<label className="label" htmlFor="startTime">
				<span className="label-text">開始時刻</span>
			</label>
			<input
				id="startTime"
				type="time"
				className={`input-bordered input w-full ${errors.startTime ? 'input-error' : ''}`}
				aria-label="開始時刻"
				{...register('startTime')}
			/>
			{errors.startTime && (
				<label className="label">
					<span className="label-text-alt text-error">
						{errors.startTime.message}
					</span>
				</label>
			)}
		</div>

		{/* 終了時刻 */}
		<div className="form-control">
			<label className="label" htmlFor="endTime">
				<span className="label-text">終了時刻</span>
			</label>
			<input
				id="endTime"
				type="time"
				className={`input-bordered input w-full ${errors.endTime ? 'input-error' : ''}`}
				aria-label="終了時刻"
				{...register('endTime')}
			/>
			{errors.endTime && (
				<label className="label">
					<span className="label-text-alt text-error">
						{errors.endTime.message}
					</span>
				</label>
			)}
		</div>

		{/* 備考 */}
		<div className="form-control">
			<label className="label" htmlFor="note">
				<span className="label-text">備考</span>
			</label>
			<textarea
				id="note"
				className={`textarea-bordered textarea w-full ${errors.note ? 'textarea-error' : ''}`}
				aria-label="備考"
				rows={3}
				{...register('note')}
			/>
			{errors.note && (
				<label className="label">
					<span className="label-text-alt text-error">
						{errors.note.message}
					</span>
				</label>
			)}
		</div>
	</>
);
