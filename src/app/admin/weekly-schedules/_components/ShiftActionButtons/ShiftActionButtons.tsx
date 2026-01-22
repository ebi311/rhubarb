import type { ShiftStatus } from '../ShiftTable';

type ShiftActionButtonsProps = {
	status: ShiftStatus;
	isUnassigned: boolean;
	onChangeStaff: () => void;
	onAssignStaff: () => void;
	onCancelShift: () => void;
};

export const ShiftActionButtons = ({
	status,
	isUnassigned,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
}: ShiftActionButtonsProps) => {
	// scheduled以外のステータスではアクション不可
	if (status !== 'scheduled') {
		return null;
	}

	return (
		<div className="flex gap-1">
			{isUnassigned ? (
				<button
					type="button"
					className="btn btn-xs btn-primary"
					onClick={onAssignStaff}
				>
					割り当て
				</button>
			) : (
				<button
					type="button"
					className="btn btn-outline btn-xs"
					onClick={onChangeStaff}
				>
					変更
				</button>
			)}
			<button
				type="button"
				className="btn btn-outline btn-xs btn-error"
				onClick={onCancelShift}
			>
				キャンセル
			</button>
		</div>
	);
};
