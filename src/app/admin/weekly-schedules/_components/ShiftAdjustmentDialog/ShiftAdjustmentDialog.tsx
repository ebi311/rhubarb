'use client';

import {
	suggestClientDatetimeChangeAdjustmentsAction,
	suggestShiftAdjustmentsAction,
} from '@/app/actions/shiftAdjustments';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type {
	ClientDatetimeChangeActionInput,
	ShiftAdjustmentOperation,
	ShiftAdjustmentShiftSuggestion,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import {
	formatJstDateString,
	getJstDateOnly,
	stringToTimeObject,
} from '@/utils/date';
import { useEffect, useMemo, useState } from 'react';
import type { ShiftDisplayRow } from '../ShiftTable';

type ShiftAdjustmentDialogProps = {
	isOpen: boolean;
	weekStartDate: Date;
	staffOptions: StaffPickerOption[];
	shifts: ShiftDisplayRow[];
	onClose: () => void;
	requestSuggestions?: (input: {
		staffId: string;
		startDate: string;
		endDate: string;
		memo?: string;
	}) => Promise<ActionResult<SuggestShiftAdjustmentsOutput>>;
	requestClientDatetimeChangeSuggestions?: (
		input: ClientDatetimeChangeActionInput,
	) => Promise<ActionResult<SuggestClientDatetimeChangeAdjustmentsOutput>>;
};

const resolveShiftTitle = (
	shift: ShiftDisplayRow | undefined,
	fallback: { id: string; date: Date; start: string; end: string },
) => {
	if (!shift) {
		return `シフト ${fallback.id}（${fallback.start}〜${fallback.end}）`;
	}
	return `${shift.clientName}（${shift.startTime.hour
		.toString()
		.padStart(2, '0')}:${shift.startTime.minute
		.toString()
		.padStart(2, '0')}〜${shift.endTime.hour
		.toString()
		.padStart(2, '0')}:${shift.endTime.minute.toString().padStart(2, '0')}）`;
};

/* eslint-disable complexity */
export const ShiftAdjustmentDialog = ({
	isOpen,
	weekStartDate,
	staffOptions,
	shifts,
	onClose,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
}: ShiftAdjustmentDialogProps) => {
	const [adjustmentType, setAdjustmentType] = useState<
		'staff_absence' | 'client_datetime_change'
	>('staff_absence');
	const helperStaffOptions = useMemo(
		() => staffOptions.filter((s) => s.role === 'helper'),
		[staffOptions],
	);

	const weekEndDate = useMemo(() => {
		const start = getJstDateOnly(weekStartDate);
		return new Date(start.getTime() + 6 * 86400000);
	}, [weekStartDate]);

	const [staffId, setStaffId] = useState('');
	const [startDateStr, setStartDateStr] = useState(
		formatJstDateString(weekStartDate),
	);
	const [endDateStr, setEndDateStr] = useState(
		formatJstDateString(weekEndDate),
	);
	const [targetShiftId, setTargetShiftId] = useState('');
	const [newDateStr, setNewDateStr] = useState(
		formatJstDateString(weekStartDate),
	);
	const [newStartTime, setNewStartTime] = useState('09:00');
	const [newEndTime, setNewEndTime] = useState('10:00');
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultData, setResultData] =
		useState<SuggestShiftAdjustmentsOutput | null>(null);
	const [clientResultData, setClientResultData] =
		useState<SuggestClientDatetimeChangeAdjustmentsOutput | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		setAdjustmentType('staff_absence');
		setStaffId('');
		setStartDateStr(formatJstDateString(weekStartDate));
		setEndDateStr(formatJstDateString(weekEndDate));
		setTargetShiftId('');
		setNewDateStr(formatJstDateString(weekStartDate));
		setNewStartTime('09:00');
		setNewEndTime('10:00');
		setMemo('');
		setIsSubmitting(false);
		setErrorMessage(null);
		setResultData(null);
		setClientResultData(null);
	}, [isOpen, weekStartDate, weekEndDate]);

	const shiftMap = useMemo(() => {
		const map = new Map<string, ShiftDisplayRow>();
		for (const s of shifts) map.set(s.id, s);
		return map;
	}, [shifts]);

	const staffNameMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of helperStaffOptions) map.set(s.id, s.name);
		return map;
	}, [helperStaffOptions]);

	const selectedStaffName = staffNameMap.get(staffId);

	const targetableShifts = useMemo(() => {
		const weekStart = getJstDateOnly(weekStartDate).getTime();
		const weekEnd = weekStart + 6 * 86400000;
		return shifts.filter((shift) => {
			const dateTime = getJstDateOnly(shift.date).getTime();
			return (
				shift.status === 'scheduled' &&
				!shift.isUnassigned &&
				shift.staffId !== null &&
				dateTime >= weekStart &&
				dateTime <= weekEnd
			);
		});
	}, [shifts, weekStartDate]);

	const handleStaffAbsenceSubmit = async () => {
		setErrorMessage(null);
		setResultData(null);
		setClientResultData(null);
		if (startDateStr > endDateStr) {
			setErrorMessage('開始日は終了日以前を指定してください。');
			return;
		}
		setIsSubmitting(true);
		try {
			const action = requestSuggestions ?? suggestShiftAdjustmentsAction;
			const res = await action({
				staffId,
				startDate: startDateStr,
				endDate: endDateStr,
				memo: memo.trim() ? memo.trim() : undefined,
			});
			if (res.error) {
				setErrorMessage(res.error);
				return;
			}
			setResultData(res.data);
			setClientResultData(null);
		} catch {
			setErrorMessage(
				'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClientDatetimeChangeSubmit = async () => {
		setErrorMessage(null);
		setResultData(null);
		setClientResultData(null);
		const parsedStartTime = stringToTimeObject(newStartTime);
		const parsedEndTime = stringToTimeObject(newEndTime);
		if (!parsedStartTime || !parsedEndTime) {
			setErrorMessage('時刻の形式が不正です。HH:mm 形式で入力してください。');
			return;
		}
		const startTotalMinutes =
			parsedStartTime.hour * 60 + parsedStartTime.minute;
		const endTotalMinutes = parsedEndTime.hour * 60 + parsedEndTime.minute;
		if (startTotalMinutes >= endTotalMinutes) {
			setErrorMessage('開始時刻は終了時刻より前を指定してください。');
			return;
		}
		setIsSubmitting(true);
		try {
			const action =
				requestClientDatetimeChangeSuggestions ??
				suggestClientDatetimeChangeAdjustmentsAction;
			const res = await action({
				shiftId: targetShiftId,
				newDate: newDateStr,
				newStartTime: parsedStartTime,
				newEndTime: parsedEndTime,
				memo: memo.trim() ? memo.trim() : undefined,
			});
			if (res.error) {
				setErrorMessage(res.error);
				return;
			}
			setClientResultData(res.data);
			setResultData(null);
		} catch {
			setErrorMessage(
				'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async () => {
		if (adjustmentType === 'staff_absence') {
			await handleStaffAbsenceSubmit();
			return;
		}
		await handleClientDatetimeChangeSubmit();
	};

	const renderAffected = (affected: ShiftAdjustmentShiftSuggestion) => {
		const shift = affected.shift;
		const shiftRow = shiftMap.get(shift.id);
		const start = `${shift.start_time.hour
			.toString()
			.padStart(2, '0')}:${shift.start_time.minute
			.toString()
			.padStart(2, '0')}`;
		const end = `${shift.end_time.hour
			.toString()
			.padStart(2, '0')}:${shift.end_time.minute.toString().padStart(2, '0')}`;

		return (
			<div key={shift.id} className="card card-border">
				<div className="card-body gap-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="card-title text-base">
							{resolveShiftTitle(shiftRow, {
								id: shift.id,
								date: shift.date,
								start,
								end,
							})}
						</h3>
						<span className="text-sm text-base-content/70">
							{formatJstDateString(shift.date)}
						</span>
					</div>

					{affected.suggestions.length === 0 ? (
						<div className="alert alert-warning">
							このシフトに対する候補が見つかりませんでした。
						</div>
					) : (
						<ul className="list">
							{affected.suggestions.map((s, idx) => {
								const describeOperation = (op: ShiftAdjustmentOperation) => {
									const row = shiftMap.get(op.shift_id);
									const startStr = row
										? `${row.startTime.hour.toString().padStart(2, '0')}:${row.startTime.minute
												.toString()
												.padStart(2, '0')}`
										: '--:--';
									const endStr = row
										? `${row.endTime.hour.toString().padStart(2, '0')}:${row.endTime.minute
												.toString()
												.padStart(2, '0')}`
										: '--:--';
									const shiftTitle = resolveShiftTitle(row, {
										id: op.shift_id,
										date: row?.date ?? shift.date,
										start: startStr,
										end: endStr,
									});

									if (op.type === 'change_staff') {
										const toName =
											staffNameMap.get(op.to_staff_id) ?? op.to_staff_id;
										return {
											shiftId: op.shift_id,
											summary:
												op.shift_id === shift.id
													? `${toName} に変更`
													: `${shiftTitle} を ${toName} に変更`,
										};
									}

									const newDateStr = formatJstDateString(op.new_date);
									const newStart = `${op.new_start_time.hour.toString().padStart(2, '0')}:${op.new_start_time.minute
										.toString()
										.padStart(2, '0')}`;
									const newEnd = `${op.new_end_time.hour.toString().padStart(2, '0')}:${op.new_end_time.minute
										.toString()
										.padStart(2, '0')}`;
									return {
										shiftId: op.shift_id,
										summary:
											op.shift_id === shift.id
												? `日時を ${newDateStr} ${newStart}〜${newEnd} に変更`
												: `${shiftTitle} の日時を ${newDateStr} ${newStart}〜${newEnd} に変更`,
									};
								};

								const firstOp = s.operations[0]!;
								const secondOp = s.operations[1];
								const first = describeOperation(firstOp);
								const second = secondOp ? describeOperation(secondOp) : null;
								const rationaleText = s.rationale
									.map((r) => r.message)
									.join(' / ');
								return (
									<li key={`${shift.id}-${idx}`} className="list-row">
										<div className="text-sm">
											<div className="font-medium">
												案{idx + 1}: {first.summary}
											</div>
											{second ? (
												<div className="text-base-content/70">
													2手目: {second.summary}
												</div>
											) : null}
											<div className="text-base-content/70">
												{rationaleText}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		);
	};

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			className="modal-open modal modal-bottom sm:modal-middle"
			aria-modal="true"
		>
			<div className="modal-box max-w-3xl">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h2 className="text-xl font-semibold">調整相談（Phase 1）</h2>
						<p className="text-sm text-base-content/70">
							調整タイプを選び、提案結果を確認できます（提案のみ・自動適用なし）
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={onClose}
						disabled={isSubmitting}
					>
						✕
					</button>
				</div>

				<div className="mt-4 space-y-4">
					<div role="radiogroup" aria-label="調整タイプ" className="join">
						<input
							type="radio"
							name="adjustment-type"
							className="btn join-item"
							aria-label="スタッフ欠勤"
							checked={adjustmentType === 'staff_absence'}
							onChange={() => {
								setAdjustmentType('staff_absence');
								setResultData(null);
								setClientResultData(null);
								setErrorMessage(null);
							}}
							disabled={isSubmitting}
						/>
						<input
							type="radio"
							name="adjustment-type"
							className="btn join-item"
							aria-label="利用者都合の日時変更"
							checked={adjustmentType === 'client_datetime_change'}
							onChange={() => {
								setAdjustmentType('client_datetime_change');
								setResultData(null);
								setClientResultData(null);
								setErrorMessage(null);
							}}
							disabled={isSubmitting}
						/>
					</div>

					{adjustmentType === 'staff_absence' ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="sm:col-span-1">
								<label className="label" htmlFor="shift-adjust-staff">
									<span className="label-text font-medium">欠勤スタッフ</span>
								</label>
								<select
									id="shift-adjust-staff"
									className="select-bordered select w-full"
									value={staffId}
									onChange={(e) => setStaffId(e.target.value)}
									disabled={isSubmitting}
								>
									<option value="" disabled>
										スタッフを選択
									</option>
									{helperStaffOptions.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="label" htmlFor="shift-adjust-start">
									<span className="label-text font-medium">開始日</span>
								</label>
								<input
									id="shift-adjust-start"
									type="date"
									className="input-bordered input w-full"
									value={startDateStr}
									onChange={(e) => setStartDateStr(e.target.value)}
									disabled={isSubmitting}
								/>
							</div>
							<div>
								<label className="label" htmlFor="shift-adjust-end">
									<span className="label-text font-medium">終了日</span>
								</label>
								<input
									id="shift-adjust-end"
									type="date"
									className="input-bordered input w-full"
									value={endDateStr}
									onChange={(e) => setEndDateStr(e.target.value)}
									disabled={isSubmitting}
								/>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<div>
								<label className="label" htmlFor="shift-adjust-target-shift">
									<span className="label-text font-medium">1) 対象シフト</span>
								</label>
								<select
									id="shift-adjust-target-shift"
									className="select-bordered select w-full"
									value={targetShiftId}
									onChange={(e) => setTargetShiftId(e.target.value)}
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
										<span className="label-text font-medium">
											2) 新しい日付
										</span>
									</label>
									<input
										id="shift-adjust-new-date"
										type="date"
										className="input-bordered input w-full"
										value={newDateStr}
										onChange={(e) => setNewDateStr(e.target.value)}
										disabled={isSubmitting}
									/>
								</div>
								<div>
									<label
										className="label"
										htmlFor="shift-adjust-new-start-time"
									>
										<span className="label-text font-medium">
											新しい開始時刻
										</span>
									</label>
									<input
										id="shift-adjust-new-start-time"
										type="time"
										className="input-bordered input w-full"
										value={newStartTime}
										onChange={(e) => setNewStartTime(e.target.value)}
										disabled={isSubmitting}
									/>
								</div>
								<div>
									<label className="label" htmlFor="shift-adjust-new-end-time">
										<span className="label-text font-medium">
											新しい終了時刻
										</span>
									</label>
									<input
										id="shift-adjust-new-end-time"
										type="time"
										className="input-bordered input w-full"
										value={newEndTime}
										onChange={(e) => setNewEndTime(e.target.value)}
										disabled={isSubmitting}
									/>
								</div>
							</div>
						</div>
					)}

					<div>
						<label className="label" htmlFor="shift-adjust-memo">
							<span className="label-text">メモ（任意）</span>
						</label>
						<textarea
							id="shift-adjust-memo"
							className="textarea-bordered textarea w-full"
							rows={3}
							placeholder="例: 急な発熱のため休み"
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					{adjustmentType === 'staff_absence' && selectedStaffName && (
						<div className="alert alert-info">
							<strong className="font-medium">対象:</strong> {selectedStaffName}
						</div>
					)}
					{errorMessage && (
						<div className="alert alert-error">{errorMessage}</div>
					)}

					{adjustmentType === 'staff_absence' && resultData && (
						<div className="space-y-3">
							<div className="divider">提案結果</div>
							{resultData.meta?.timedOut ? (
								<div className="alert alert-warning">
									一部の提案探索が時間上限に達したため、結果は部分的な可能性があります。
								</div>
							) : null}
							{resultData.affected.length === 0 ? (
								<div className="alert alert-success">
									対象期間に該当するシフトがありません。
								</div>
							) : (
								<div className="grid grid-cols-1 gap-3">
									{resultData.affected.map(renderAffected)}
								</div>
							)}
							<div className="alert alert-soft">
								提案は自動適用されません。必要に応じて、各シフトの「担当者変更」から反映してください。
							</div>
						</div>
					)}

					{adjustmentType === 'client_datetime_change' && clientResultData && (
						<div className="space-y-3">
							<div className="divider">提案結果</div>
							{clientResultData.meta?.timedOut ? (
								<div className="alert alert-warning">
									一部の提案探索が時間上限に達したため、結果は部分的な可能性があります。
								</div>
							) : null}
							{renderAffected(clientResultData.target)}
							<div className="alert alert-soft">
								提案は自動適用されません。内容を確認して必要に応じて手動反映してください。
							</div>
						</div>
					)}
				</div>

				<div className="modal-action">
					<button
						type="button"
						className="btn btn-ghost"
						onClick={onClose}
						disabled={isSubmitting}
					>
						閉じる
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleSubmit}
						disabled={
							adjustmentType === 'staff_absence'
								? !staffId || !startDateStr || !endDateStr || isSubmitting
								: !targetShiftId ||
									!newDateStr ||
									!newStartTime ||
									!newEndTime ||
									isSubmitting
						}
					>
						{isSubmitting ? '取得中...' : '提案を取得'}
					</button>
				</div>
			</div>
		</div>
	);
};
/* eslint-enable complexity */
