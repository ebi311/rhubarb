'use client';

import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useState } from 'react';
import {
	CreateOneOffShiftDialog,
	type CreateOneOffShiftDialogClientOption,
} from '../CreateOneOffShiftDialog';

export type CreateOneOffShiftButtonProps = {
	weekStartDate: Date;
	clientOptions: CreateOneOffShiftDialogClientOption[];
	staffOptions: StaffPickerOption[];
};

export const CreateOneOffShiftButton = ({
	weekStartDate,
	clientOptions,
	staffOptions,
}: CreateOneOffShiftButtonProps) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				className="btn btn-sm"
				onClick={() => setIsOpen(true)}
			>
				単発シフト追加
			</button>
			{isOpen && (
				<CreateOneOffShiftDialog
					isOpen={isOpen}
					weekStartDate={weekStartDate}
					clientOptions={clientOptions}
					staffOptions={staffOptions}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</>
	);
};
