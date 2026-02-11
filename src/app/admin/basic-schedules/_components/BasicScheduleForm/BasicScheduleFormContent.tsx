import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import {
	ClientReadOnlyField,
	ClientSelectField,
	NoteField,
	ServiceTypeSelectField,
	TimeField,
	WeekdayField,
	WeekdayReadOnlyField,
} from './FormControls';
import { ApiErrorMessage } from './FormMessages';
import { shouldDisableSubmitButton } from './helpers';
import { StaffSelectionSummary } from './StaffSelectionSummary';

export type BasicScheduleFormContentProps = {
	// フィールド表示用
	serviceUsers: ServiceUser[];
	serviceTypes: ServiceTypeOption[];
	isEditMode: boolean;
	fixedClientId?: string;
	fixedClientName?: string;
	fixedWeekday?: DayOfWeek;
	// フォーム状態
	isSubmitting: boolean;
	isValid: boolean;
	noteValue: string;
	apiError: string | null;
	// 担当者選択
	staffSelection: {
		selectedStaff: StaffRecord | null;
		staffStatusMessage: string;
		staffPickerDisabled: boolean;
		staffClearDisabled: boolean;
		openStaffPicker: () => void;
		handleStaffClear: () => void;
	};
	// ボタン
	submitButtonText: string;
	submitButtonClass: string;
	// 削除（編集モード用）
	isDeleting?: boolean;
	onDelete?: () => void;
	// キャンセル（モーダル用）
	onCancel?: () => void;
};

export const BasicScheduleFormContent = ({
	serviceUsers,
	serviceTypes,
	isEditMode,
	fixedClientId,
	fixedClientName,
	fixedWeekday,
	isSubmitting,
	isValid,
	noteValue,
	apiError,
	staffSelection,
	submitButtonText,
	submitButtonClass,
	isDeleting = false,
	onDelete,
	onCancel,
}: BasicScheduleFormContentProps) => {
	const isSubmitDisabled = shouldDisableSubmitButton(isValid, isSubmitting);

	return (
		<div className="flex flex-col gap-4">
			{/* 利用者フィールド */}
			{fixedClientId && fixedClientName ? (
				<ClientReadOnlyField clientName={fixedClientName} />
			) : (
				<ClientSelectField serviceUsers={serviceUsers} disabled={isEditMode} />
			)}
			<ServiceTypeSelectField serviceTypes={serviceTypes} />
			{/* 曜日フィールド */}
			{fixedWeekday ? (
				<WeekdayReadOnlyField weekday={fixedWeekday} />
			) : (
				<WeekdayField />
			)}
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

			<FormActionButtons
				isEditMode={isEditMode}
				isSubmitting={isSubmitting}
				isDeleting={isDeleting}
				isSubmitDisabled={isSubmitDisabled}
				submitButtonText={submitButtonText}
				submitButtonClass={submitButtonClass}
				onDelete={onDelete}
				onCancel={onCancel}
			/>
		</div>
	);
};

type FormActionButtonsProps = {
	isEditMode: boolean;
	isSubmitting: boolean;
	isDeleting: boolean;
	isSubmitDisabled: boolean;
	submitButtonText: string;
	submitButtonClass: string;
	onDelete?: () => void;
	onCancel?: () => void;
};

const FormActionButtons = ({
	isEditMode,
	isSubmitting,
	isDeleting,
	isSubmitDisabled,
	submitButtonText,
	submitButtonClass,
	onDelete,
	onCancel,
}: FormActionButtonsProps) => (
	<div className="flex justify-between">
		{isEditMode ? (
			<button
				type="button"
				className="btn btn-outline btn-error"
				onClick={onDelete}
				disabled={isDeleting || isSubmitting}
			>
				{isDeleting ? '削除中...' : '削除する'}
			</button>
		) : onCancel ? (
			<button type="button" className="btn btn-ghost" onClick={onCancel}>
				キャンセル
			</button>
		) : (
			<div />
		)}
		<button
			type="submit"
			className={submitButtonClass}
			disabled={isSubmitDisabled}
		>
			{submitButtonText}
		</button>
	</div>
);
