import type { ShiftStatus } from '../ShiftTable';

type ShiftActionButtonsProps = {
	status: ShiftStatus;
	onCancelShift: () => void;
	onRestoreShift?: () => void;
};

export const ShiftActionButtons = ({
	status,
	onCancelShift,
	onRestoreShift,
}: ShiftActionButtonsProps) => {
	// canceled のステータスでは復元ボタンを表示
	if (status === 'canceled') {
		return (
			<button
				type="button"
				className="btn btn-outline btn-xs btn-primary"
				onClick={onRestoreShift}
			>
				復元
			</button>
		);
	}

	// scheduled以外のステータスではアクション不可
	if (status !== 'scheduled') {
		return null;
	}

	return (
		<button
			type="button"
			className="btn btn-outline btn-xs btn-error"
			onClick={onCancelShift}
		>
			キャンセル
		</button>
	);
};
