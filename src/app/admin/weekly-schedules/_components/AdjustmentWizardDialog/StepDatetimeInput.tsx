'use client';

import {
	formatJstDateString,
	parseJstDateString,
	setJstTime,
	toJstTimeStr,
} from '@/utils/date';
import { useState } from 'react';

type StepDatetimeInputProps = {
	initialStartTime: Date;
	initialEndTime: Date;
	onShowCandidates: (payload: { newStartTime: Date; newEndTime: Date }) => void;
};

const toDateTime = (dateStr: string, timeStr: string): Date | null => {
	const [hourStr, minuteStr] = timeStr.split(':');
	const hour = Number(hourStr);
	const minute = Number(minuteStr);
	if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
		return null;
	}
	try {
		return setJstTime(parseJstDateString(dateStr), hour, minute);
	} catch {
		return null;
	}
};

export const StepDatetimeInput = ({
	initialStartTime,
	initialEndTime,
	onShowCandidates,
}: StepDatetimeInputProps) => {
	const [dateStr, setDateStr] = useState(formatJstDateString(initialStartTime));
	const [startTimeStr, setStartTimeStr] = useState(
		toJstTimeStr(initialStartTime),
	);
	const [endTimeStr, setEndTimeStr] = useState(toJstTimeStr(initialEndTime));
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = () => {
		if (!dateStr) {
			setErrorMessage('日付を入力してください。');
			return;
		}
		const newStartTime = toDateTime(dateStr, startTimeStr);
		const newEndTime = toDateTime(dateStr, endTimeStr);

		if (!newStartTime || !newEndTime) {
			setErrorMessage('時刻を正しく入力してください。');
			return;
		}

		if (newStartTime.getTime() >= newEndTime.getTime()) {
			setErrorMessage('開始時刻は終了時刻より前に設定してください。');
			return;
		}

		setErrorMessage(null);
		onShowCandidates({ newStartTime, newEndTime });
	};

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">日時を入力</h3>
			<p className="text-sm text-base-content/70">
				変更後の日時を入力して、候補ヘルパーを確認してください。
			</p>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<label className="form-control w-full gap-1">
					<span className="label-text">日付</span>
					<input
						type="date"
						className="input-bordered input w-full"
						value={dateStr}
						onChange={(event) => setDateStr(event.target.value)}
					/>
				</label>
				<label className="form-control w-full gap-1">
					<span className="label-text">開始時刻</span>
					<input
						type="time"
						className="input-bordered input w-full"
						value={startTimeStr}
						onChange={(event) => setStartTimeStr(event.target.value)}
					/>
				</label>
				<label className="form-control w-full gap-1">
					<span className="label-text">終了時刻</span>
					<input
						type="time"
						className="input-bordered input w-full"
						value={endTimeStr}
						onChange={(event) => setEndTimeStr(event.target.value)}
					/>
				</label>
			</div>

			{errorMessage && <p className="text-sm text-error">{errorMessage}</p>}

			<div>
				<button
					type="button"
					className="btn btn-outline"
					onClick={handleSubmit}
				>
					候補を表示
				</button>
			</div>
		</div>
	);
};

export type { StepDatetimeInputProps };
