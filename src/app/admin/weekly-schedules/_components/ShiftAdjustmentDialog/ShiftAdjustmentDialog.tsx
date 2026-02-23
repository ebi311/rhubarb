'use client';

import { suggestShiftAdjustmentsAction } from '@/app/actions/shiftAdjustments';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type {
	ShiftAdjustmentOperation,
	ShiftAdjustmentShiftSuggestion,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import { formatJstDateString, getJstDateOnly } from '@/utils/date';
import { useMemo, useState } from 'react';
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

export const ShiftAdjustmentDialog = ({
	isOpen,
	weekStartDate,
	staffOptions,
	shifts,
	onClose,
	requestSuggestions,
}: ShiftAdjustmentDialogProps) => {
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
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultData, setResultData] =
		useState<SuggestShiftAdjustmentsOutput | null>(null);

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

	const handleSubmit = async () => {
		setErrorMessage(null);
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
		} catch {
			setErrorMessage(
				'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
			);
		} finally {
			setIsSubmitting(false);
		}
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
							欠勤スタッフの期間に影響するシフトと、担当者変更の提案を表示します（提案のみ・自動適用なし）
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

					{selectedStaffName && (
						<div className="alert alert-info">
							<strong className="font-medium">対象:</strong> {selectedStaffName}
						</div>
					)}
					{errorMessage && (
						<div className="alert alert-error">{errorMessage}</div>
					)}

					{resultData && (
						<div className="space-y-3">
							<div className="divider">提案結果</div>
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
						disabled={!staffId || !startDateStr || !endDateStr || isSubmitting}
					>
						{isSubmitting ? '取得中...' : '提案を取得'}
					</button>
				</div>
			</div>
		</div>
	);
};
