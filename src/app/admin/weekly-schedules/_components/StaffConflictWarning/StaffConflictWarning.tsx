'use client';

import { Icon } from '@/app/_components/Icon';
import { getJstHours, getJstMinutes } from '@/utils/date';

export type ConflictingShift = {
	id: string;
	clientName: string;
	startTime: Date;
	endTime: Date;
};

type StaffConflictWarningProps = {
	conflictingShifts: ConflictingShift[];
};

const formatTime = (date: Date): string => {
	const hours = getJstHours(date);
	const minutes = getJstMinutes(date);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const StaffConflictWarning = ({ conflictingShifts }: StaffConflictWarningProps) => {
	if (conflictingShifts.length === 0) return null;

	return (
		<div className="alert alert-warning">
			<Icon name="warning" className="h-6 w-6 shrink-0" />
			<div className="w-full">
				<h3 className="font-bold">時間重複の警告</h3>
				<div className="text-sm">
					このスタッフは既に以下のシフトに割り当てられています（{conflictingShifts.length}
					件）
				</div>
				<ul className="mt-2 space-y-1 text-sm">
					{conflictingShifts.map((shift) => (
						<li key={shift.id} className="flex items-center gap-2">
							<span className="font-medium">{shift.clientName}</span>
							<span className="text-xs opacity-70">
								{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
							</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};
