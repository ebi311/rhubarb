import { getJstHours, getJstMinutes } from '@/utils/date';

export type ShiftInfoCardShift = {
	clientName: string;
	serviceTypeName: string;
	date: Date;
	startTime: Date;
	endTime: Date;
	currentStaffName: string;
};

type ShiftInfoCardProps = {
	shift: ShiftInfoCardShift;
	staffLabel?: string;
};

const formatTime = (date: Date): string => {
	const hours = getJstHours(date);
	const minutes = getJstMinutes(date);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
	return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const ShiftInfoCard = ({ shift, staffLabel = '現在の担当者' }: ShiftInfoCardProps) => {
	return (
		<div className="rounded-lg border border-base-200 bg-base-100 p-4">
			<h3 className="mb-2 font-semibold">シフト情報</h3>
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt className="text-right text-base-content/70">利用者</dt>
				<dd className="font-medium">{shift.clientName}</dd>
				<dt className="text-right text-base-content/70">サービス</dt>
				<dd>{shift.serviceTypeName}</dd>
				<dt className="text-right text-base-content/70">日時</dt>
				<dd>
					{formatDate(shift.date)} {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
				</dd>
				<dt className="text-right text-base-content/70">{staffLabel}</dt>
				<dd className="font-medium">{shift.currentStaffName}</dd>
			</dl>
		</div>
	);
};
