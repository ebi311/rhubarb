import type { ShiftStatus } from '../ShiftTable';

type ShiftActionButtonsProps = {
	status: ShiftStatus;
	onCancelShift: () => void;
};

export const ShiftActionButtons = ({
	status,
	onCancelShift,
}: ShiftActionButtonsProps) => {
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
