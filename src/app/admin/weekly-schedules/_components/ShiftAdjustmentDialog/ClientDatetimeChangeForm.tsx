import { formatJstDateString } from '@/utils/date';
import type { ShiftDisplayRow } from '../ShiftTable';

type ClientDatetimeChangeFormProps = {
	targetShiftId: string;
	targetableShifts: ShiftDisplayRow[];
	newDateStr: string;
	newStartTime: string;
	newEndTime: string;
	isSubmitting: boolean;
	onTargetShiftChange: (value: string) => void;
	onNewDateChange: (value: string) => void;
	onNewStartTimeChange: (value: string) => void;
	onNewEndTimeChange: (value: string) => void;
};

export const ClientDatetimeChangeForm = ({
	targetShiftId,
	targetableShifts,
	newDateStr,
	newStartTime,
	newEndTime,
	isSubmitting,
	onTargetShiftChange,
	onNewDateChange,
	onNewStartTimeChange,
	onNewEndTimeChange,
}: ClientDatetimeChangeFormProps) => {
	return (
		<div className="space-y-3">
			<div>
				<label className="label" htmlFor="shift-adjust-target-shift">
					<span className="label-text font-medium">1) 対象シフト</span>
				</label>
				<select
					id="shift-adjust-target-shift"
					className="select-bordered select w-full"
					value={targetShiftId}
					onChange={(e) => onTargetShiftChange(e.target.value)}
					disabled={isSubmitting}
				>
					<option value="" disabled>
						対象シフトを選択
					</option>
					{targetableShifts.map((shift) => (
						<option key={shift.id} value={shift.id}>
							{`${formatJstDateString(shift.date)} ${shift.startTime.hour
								.toString()
								.padStart(2, '0')}:${shift.startTime.minute
								.toString()
								.padStart(2, '0')}〜${shift.endTime.hour
								.toString()
								.padStart(2, '0')}:${shift.endTime.minute
								.toString()
								.padStart(2, '0')} ${shift.clientName}`}
						</option>
					))}
				</select>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div>
					<label className="label" htmlFor="shift-adjust-new-date">
						<span className="label-text font-medium">2) 新しい日付</span>
					</label>
					<input
						id="shift-adjust-new-date"
						type="date"
						className="input-bordered input w-full"
						value={newDateStr}
						onChange={(e) => onNewDateChange(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>
				<div>
					<label className="label" htmlFor="shift-adjust-new-start-time">
						<span className="label-text font-medium">新しい開始時刻</span>
					</label>
					<input
						id="shift-adjust-new-start-time"
						type="time"
						className="input-bordered input w-full"
						value={newStartTime}
						onChange={(e) => onNewStartTimeChange(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>
				<div>
					<label className="label" htmlFor="shift-adjust-new-end-time">
						<span className="label-text font-medium">新しい終了時刻</span>
					</label>
					<input
						id="shift-adjust-new-end-time"
						type="time"
						className="input-bordered input w-full"
						value={newEndTime}
						onChange={(e) => onNewEndTimeChange(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>
			</div>
		</div>
	);
};
