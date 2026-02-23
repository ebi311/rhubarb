import type {
	ShiftAdjustmentOperation,
	ShiftAdjustmentShiftSuggestion,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import { formatJstDateString } from '@/utils/date';
import type { ShiftDisplayRow } from '../ShiftTable';

type SuggestionResultsProps = {
	adjustmentType: 'staff_absence' | 'client_datetime_change';
	resultData: SuggestShiftAdjustmentsOutput | null;
	clientResultData: SuggestClientDatetimeChangeAdjustmentsOutput | null;
	shiftMap: Map<string, ShiftDisplayRow>;
	staffNameMap: Map<string, string>;
};

const resolveShiftTitle = (
	shift: ShiftDisplayRow | undefined,
	fallback: { id: string; date: Date; start: string; end: string },
) => {
	if (!shift) {
		return `シフト ${fallback.id}（${fallback.start}〜${fallback.end}）`;
	}
	return `${shift.clientName}（${shift.startTime.hour.toString().padStart(2, '0')}:${shift.startTime.minute
		.toString()
		.padStart(2, '0')}〜${shift.endTime.hour
		.toString()
		.padStart(2, '0')}:${shift.endTime.minute.toString().padStart(2, '0')}）`;
};

export const SuggestionResults = ({
	adjustmentType,
	resultData,
	clientResultData,
	shiftMap,
	staffNameMap,
}: SuggestionResultsProps) => {
	const renderAffected = (affected: ShiftAdjustmentShiftSuggestion) => {
		const shift = affected.shift;
		const shiftRow = shiftMap.get(shift.id);
		const start = `${shift.start_time.hour.toString().padStart(2, '0')}:${shift.start_time.minute
			.toString()
			.padStart(2, '0')}`;
		const end = `${shift.end_time.hour.toString().padStart(2, '0')}:${shift.end_time.minute
			.toString()
			.padStart(2, '0')}`;

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
							{affected.suggestions.map((suggestion, idx) => {
								const describeOperation = (op: ShiftAdjustmentOperation) => {
									const row = shiftMap.get(op.shift_id);
									const startStr = row
										? `${row.startTime.hour
												.toString()
												.padStart(2, '0')}:${row.startTime.minute
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
									const newStart = `${op.new_start_time.hour
										.toString()
										.padStart(2, '0')}:${op.new_start_time.minute
										.toString()
										.padStart(2, '0')}`;
									const newEnd = `${op.new_end_time.hour
										.toString()
										.padStart(2, '0')}:${op.new_end_time.minute
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

								const firstOp = suggestion.operations[0]!;
								const secondOp = suggestion.operations[1];
								const first = describeOperation(firstOp);
								const second = secondOp ? describeOperation(secondOp) : null;
								const rationaleText = suggestion.rationale
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

	if (adjustmentType === 'staff_absence' && resultData) {
		return (
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
		);
	}

	if (adjustmentType === 'client_datetime_change' && clientResultData) {
		return (
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
		);
	}

	return null;
};
