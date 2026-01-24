import { Icon } from '@/app/_components/Icon';
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
				title="キャンセルの取り消し"
				aria-label="キャンセルの取り消し"
			>
				<Icon name="undo" />
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
			className="btn btn-ghost btn-xs btn-error"
			onClick={onCancelShift}
			title="シフトをキャンセル"
			aria-label="シフトをキャンセル"
		>
			<Icon name="cancel" />
		</button>
	);
};
