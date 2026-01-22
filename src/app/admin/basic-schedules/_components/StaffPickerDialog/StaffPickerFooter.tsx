import type { StaffPickerOption } from './types';

type StaffPickerFooterProps = {
	pendingStaff: StaffPickerOption | null;
	onClose: () => void;
	onConfirm: () => void;
	confirmDisabled: boolean;
};

export const StaffPickerFooter = ({
	pendingStaff,
	onClose,
	onConfirm,
	confirmDisabled,
}: StaffPickerFooterProps) => (
	<div className="modal-action flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div className="text-sm text-base-content/70">
			{pendingStaff ? (
				<span>
					選択中:{' '}
					<span className="font-semibold text-base-content">
						{pendingStaff.name}
					</span>
				</span>
			) : (
				<span>現在選択されている担当者はありません。</span>
			)}
		</div>
		<div className="flex flex-col gap-2 sm:flex-row">
			<button type="button" className="btn" onClick={onClose}>
				閉じる
			</button>
			<button
				type="button"
				className="btn btn-primary"
				onClick={onConfirm}
				disabled={confirmDisabled}
			>
				確定する
			</button>
		</div>
	</div>
);
