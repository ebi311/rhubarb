'use client';

export type CreateOneOffShiftButtonProps = {
	onOpen: () => void;
	disabled?: boolean;
};

export const CreateOneOffShiftButton = ({
	onOpen,
	disabled = false,
}: CreateOneOffShiftButtonProps) => {
	return (
		<button
			type="button"
			className="btn btn-sm"
			onClick={onOpen}
			disabled={disabled}
		>
			単発シフト追加
		</button>
	);
};
