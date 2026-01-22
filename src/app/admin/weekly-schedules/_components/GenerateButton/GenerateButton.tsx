'use client';

import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';
import { formatJstDateString } from '@/utils/date';
import { useState } from 'react';

export type GenerateResult = {
	created: number;
	skipped: number;
};

export interface GenerateButtonProps {
	weekStartDate: Date;
	onGenerated?: (result: GenerateResult) => void;
	disabled?: boolean;
}

export const GenerateButton = ({
	weekStartDate,
	onGenerated,
	disabled = false,
}: GenerateButtonProps) => {
	const [isLoading, setIsLoading] = useState(false);

	const handleClick = async () => {
		setIsLoading(true);
		try {
			const result = await generateWeeklyShiftsAction(
				formatJstDateString(weekStartDate),
			);
			if (result.data && onGenerated) {
				onGenerated(result.data);
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<button
			type="button"
			className="btn btn-sm btn-primary"
			onClick={handleClick}
			disabled={disabled || isLoading}
		>
			{isLoading ? (
				<>
					<span className="loading loading-sm loading-spinner" />
					生成中...
				</>
			) : (
				'シフトを生成'
			)}
		</button>
	);
};
