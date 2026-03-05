'use client';

import { suggestStaffAbsenceAdjustmentsAction } from '@/app/actions/shiftAdjustments';
import {
	suggestCandidateStaffForShiftAction,
	suggestCandidateStaffForShiftWithNewDatetimeAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import { errorResult, successResult } from '@/app/actions/utils/actionResult';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	StaffAbsenceActionInput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import { formatJstDateString, getJstHours, getJstMinutes } from '@/utils/date';
import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react';
import {
	StepDatetimeCandidates,
	type StepDatetimeCandidatesProps,
} from './StepDatetimeCandidates';
import { StepDatetimeInput } from './StepDatetimeInput';
import {
	StepHelperCandidates,
	type StepHelperCandidatesProps,
} from './StepHelperCandidates';

type WizardStep =
	| 'select'
	| 'helper-candidates'
	| 'datetime-input'
	| 'datetime-candidates'
	| 'staff-absence-suggestions';

const SelectStep = ({
	onSelectHelperCandidates,
	onSelectDatetime,
	onSelectStaffAbsence,
}: {
	onSelectHelperCandidates: () => void;
	onSelectDatetime: () => void;
	onSelectStaffAbsence?: () => void;
}) => {
	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">処理を選択</h3>
			<p className="text-sm text-base-content/70">
				実行したい調整方法を選択してください。
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<button
					type="button"
					className="btn btn-outline"
					onClick={onSelectHelperCandidates}
				>
					ヘルパーの変更
				</button>
				<button
					type="button"
					className="btn btn-outline"
					onClick={onSelectDatetime}
				>
					日時の変更
				</button>
				{onSelectStaffAbsence && (
					<button
						type="button"
						className="btn btn-outline sm:col-span-2"
						onClick={onSelectStaffAbsence}
					>
						スタッフ急休の提案を確認
					</button>
				)}
			</div>
		</div>
	);
};

export type AdjustmentWizardSuggestion = {
	shiftId: string;
	newStaffId: string;
	newStartTime: Date;
	newEndTime: Date;
};

export type AdjustmentWizardStaffAbsenceSelection = {
	shift: SuggestShiftAdjustmentsOutput['affected'][number]['shift'];
	suggestion: SuggestShiftAdjustmentsOutput['affected'][number]['suggestions'][number];
};

type AdjustmentWizardDialogProps = {
	isOpen: boolean;
	shiftId: string;
	initialStartTime: Date;
	initialEndTime: Date;
	onClose: () => void;
	onAssigned?: (suggestion: AdjustmentWizardSuggestion) => void;
	onStaffAbsenceSuggestionSelected?: (
		selection: AdjustmentWizardStaffAbsenceSelection,
	) => void;
	onCascadeReopen?: (shiftIds: string[]) => void;
	staffAbsenceRequest?: StaffAbsenceActionInput;
};

type Candidate =
	Awaited<
		ReturnType<NonNullable<StepHelperCandidatesProps['requestCandidates']>>
	> extends { data: infer T }
		? T extends { candidates: infer U }
			? U extends Array<infer V>
				? V
				: never
			: never
		: never;

const mapActionError = <T,>(
	error: string | null,
	status: number,
	details: unknown,
	fallbackMessage: string,
) => {
	const message = error ?? fallbackMessage;
	if (status >= 500) {
		return errorResult<T>(message, status);
	}
	return errorResult<T>(message, status, details);
};

const buildCandidates = async (
	shiftId: string,
	startTime: Date,
	endTime: Date,
) => {
	const suggestResult = await suggestCandidateStaffForShiftAction({ shiftId });
	if (suggestResult.error || !suggestResult.data) {
		return mapActionError<{ candidates: Candidate[] }>(
			suggestResult.error,
			suggestResult.status,
			suggestResult.details,
			'候補スタッフの取得に失敗しました',
		);
	}

	const validationResults = await Promise.all(
		suggestResult.data.candidates.map(async (candidate) => {
			const availability = await validateStaffAvailabilityAction({
				staffId: candidate.staffId,
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				excludeShiftId: shiftId,
			});
			return { candidate, availability };
		}),
	);

	for (const validationResult of validationResults) {
		if (
			validationResult.availability.error ||
			!validationResult.availability.data
		) {
			return mapActionError<{ candidates: Candidate[] }>(
				validationResult.availability.error,
				validationResult.availability.status,
				validationResult.availability.details,
				'候補スタッフの取得に失敗しました',
			);
		}
	}

	const candidates: Candidate[] = validationResults.map(
		({ candidate, availability }) => ({
			staffId: candidate.staffId,
			staffName: candidate.staffName,
			conflictingShifts: (availability.data?.conflictingShifts ?? []).map(
				(shift) => ({
					shiftId: shift.id,
					clientName: shift.clientName,
					date: formatJstDateString(shift.startTime),
					startTime: {
						hour: getJstHours(shift.startTime),
						minute: getJstMinutes(shift.startTime),
					},
					endTime: {
						hour: getJstHours(shift.endTime),
						minute: getJstMinutes(shift.endTime),
					},
				}),
			),
		}),
	);

	return successResult({ candidates });
};

const successNoPersist = (): ActionResult<{
	cascadeUnassignedShiftIds: string[];
}> => ({
	data: {
		cascadeUnassignedShiftIds: [],
	},
	error: null,
	status: 200,
});

type StaffAbsenceAffectedSuggestion =
	SuggestShiftAdjustmentsOutput['affected'][number];

const toTimeLabel = (time: { hour: number; minute: number }) =>
	`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

const STAFF_ABSENCE_FETCH_ERROR_MESSAGE = '提案の取得に失敗しました';

const toOperationLabel = (
	operation: StaffAbsenceAffectedSuggestion['suggestions'][number]['operations'][number],
) => {
	switch (operation.type) {
		case 'change_staff':
			return `担当変更: ${operation.from_staff_id} → ${operation.to_staff_id}`;
		case 'update_shift_schedule':
			return `日時変更: ${formatJstDateString(operation.new_date)} ${toTimeLabel(operation.new_start_time)}-${toTimeLabel(operation.new_end_time)}`;
		default:
			return '';
	}
};

export const AdjustmentWizardDialog = ({
	isOpen,
	shiftId,
	initialStartTime,
	initialEndTime,
	onClose,
	onAssigned,
	onStaffAbsenceSuggestionSelected,
	onCascadeReopen,
	staffAbsenceRequest,
}: AdjustmentWizardDialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputIdBase = useId();
	const titleId = `${inputIdBase}-title`;
	const descriptionId = `${inputIdBase}-description`;
	const [step, setStep] = useState<WizardStep>('select');
	const [candidateDatetime, setCandidateDatetime] = useState<{
		newStartTime: Date;
		newEndTime: Date;
	}>({
		newStartTime: initialStartTime,
		newEndTime: initialEndTime,
	});
	const selectedSuggestionRef = useRef<AdjustmentWizardSuggestion | null>(null);
	const [staffAbsenceSuggestions, setStaffAbsenceSuggestions] = useState<
		SuggestShiftAdjustmentsOutput['affected']
	>([]);
	const [staffAbsenceError, setStaffAbsenceError] = useState<string | null>(
		null,
	);
	const [isStaffAbsenceLoading, setIsStaffAbsenceLoading] = useState(false);
	const [selectedStaffAbsenceSuggestions, setSelectedStaffAbsenceSuggestions] =
		useState<Record<string, number>>({});
	const staffAbsenceRequestIdRef = useRef(0);
	const { handleActionResult } = useActionResultHandler();

	const requestHelperCandidates = useCallback<
		NonNullable<StepHelperCandidatesProps['requestCandidates']>
	>(
		async ({ shiftId: targetShiftId }) =>
			buildCandidates(targetShiftId, initialStartTime, initialEndTime),
		[initialEndTime, initialStartTime],
	);

	const requestHelperAssign = useCallback<
		NonNullable<StepHelperCandidatesProps['requestAssign']>
	>(
		async ({ shiftId: targetShiftId, newStaffId }) => {
			selectedSuggestionRef.current = {
				shiftId: targetShiftId,
				newStaffId,
				newStartTime: initialStartTime,
				newEndTime: initialEndTime,
			};
			return successNoPersist();
		},
		[initialEndTime, initialStartTime],
	);

	const requestDatetimeCandidates = useCallback<
		NonNullable<StepDatetimeCandidatesProps['requestCandidates']>
	>(async ({ shiftId: targetShiftId, newStartTime, newEndTime }) => {
		const suggestResult =
			await suggestCandidateStaffForShiftWithNewDatetimeAction({
				shiftId: targetShiftId,
				newStartTime,
				newEndTime,
			});

		if (suggestResult.error || !suggestResult.data) {
			return mapActionError<{ candidates: Candidate[] }>(
				suggestResult.error,
				suggestResult.status,
				suggestResult.details,
				'候補スタッフの取得に失敗しました',
			);
		}

		return successResult({ candidates: suggestResult.data.candidates });
	}, []);

	const requestDatetimeAssign = useCallback<
		NonNullable<StepDatetimeCandidatesProps['requestAssign']>
	>(
		async ({
			shiftId: targetShiftId,
			newStaffId,
			newStartTime,
			newEndTime,
		}) => {
			selectedSuggestionRef.current = {
				shiftId: targetShiftId,
				newStaffId,
				newStartTime,
				newEndTime,
			};
			return successNoPersist();
		},
		[],
	);

	const resetStaffAbsenceState = useCallback((invalidateRequest = false) => {
		if (invalidateRequest) {
			staffAbsenceRequestIdRef.current += 1;
		}
		setStaffAbsenceSuggestions([]);
		setSelectedStaffAbsenceSuggestions({});
		setStaffAbsenceError(null);
		setIsStaffAbsenceLoading(false);
	}, []);

	const handleSelectStaffAbsence = useCallback(async () => {
		if (!staffAbsenceRequest) {
			return;
		}

		const requestId = staffAbsenceRequestIdRef.current + 1;
		staffAbsenceRequestIdRef.current = requestId;

		setStep('staff-absence-suggestions');
		setIsStaffAbsenceLoading(true);
		setStaffAbsenceError(null);

		try {
			const result =
				await suggestStaffAbsenceAdjustmentsAction(staffAbsenceRequest);
			if (staffAbsenceRequestIdRef.current !== requestId) {
				return;
			}

			const normalizedResult: ActionResult<SuggestShiftAdjustmentsOutput> =
				result.error || !result.data
					? mapActionError<SuggestShiftAdjustmentsOutput>(
							result.error,
							result.status,
							result.details,
							STAFF_ABSENCE_FETCH_ERROR_MESSAGE,
						)
					: result;

			handleActionResult(normalizedResult, {
				errorMessage:
					normalizedResult.status >= 500
						? STAFF_ABSENCE_FETCH_ERROR_MESSAGE
						: undefined,
				onSuccess: (data) => {
					if (!data) {
						return;
					}
					const initialSelections = Object.fromEntries(
						data.affected.map((affected) => [affected.shift.id, 0]),
					) as Record<string, number>;
					setStaffAbsenceSuggestions(data.affected);
					setSelectedStaffAbsenceSuggestions(initialSelections);
				},
				onError: (_error, actionResult) => {
					setStaffAbsenceSuggestions([]);
					setSelectedStaffAbsenceSuggestions({});
					setStaffAbsenceError(
						actionResult.status >= 500
							? STAFF_ABSENCE_FETCH_ERROR_MESSAGE
							: (actionResult.error ?? STAFF_ABSENCE_FETCH_ERROR_MESSAGE),
					);
				},
			});
		} catch {
			if (staffAbsenceRequestIdRef.current !== requestId) {
				return;
			}
			setStaffAbsenceSuggestions([]);
			setSelectedStaffAbsenceSuggestions({});
			setStaffAbsenceError(STAFF_ABSENCE_FETCH_ERROR_MESSAGE);
		} finally {
			if (staffAbsenceRequestIdRef.current === requestId) {
				setIsStaffAbsenceLoading(false);
			}
		}
	}, [handleActionResult, staffAbsenceRequest]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		// shiftId 変更直後の同期 setState は lint で警告されるため、
		// 次のマクロタスクでリセットして状態遷移を安定させる
		const timer = setTimeout(() => {
			setStep('select');
			setCandidateDatetime({
				newStartTime: initialStartTime,
				newEndTime: initialEndTime,
			});
			resetStaffAbsenceState(true);
			selectedSuggestionRef.current = null;
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, [
		initialEndTime,
		initialStartTime,
		isOpen,
		resetStaffAbsenceState,
		shiftId,
	]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen && !dialog.open) {
			dialog.showModal();
		}

		if (!isOpen && dialog.open) {
			dialog.close();
		}
	}, [isOpen]);

	const handleRequestClose = () => {
		setStep('select');
		resetStaffAbsenceState(true);
		selectedSuggestionRef.current = null;
		onClose();
	};

	const handleDialogClose = () => {
		setStep('select');
		resetStaffAbsenceState(true);
		selectedSuggestionRef.current = null;
		if (isOpen) {
			onClose();
		}
	};

	const handleDialogCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
		event.preventDefault();
		setStep('select');
		resetStaffAbsenceState(true);
		selectedSuggestionRef.current = null;
		onClose();
	};

	const handleAssignedComplete = () => {
		if (selectedSuggestionRef.current) {
			onAssigned?.(selectedSuggestionRef.current);
		}
		handleRequestClose();
	};

	const handleStaffAbsenceComplete = () => {
		const selectedAffectedShift = staffAbsenceSuggestions.find(
			(affected) => affected.shift.id === shiftId,
		);

		if (selectedAffectedShift) {
			const selectedIndex =
				selectedStaffAbsenceSuggestions[selectedAffectedShift.shift.id] ?? 0;
			const selectedSuggestion =
				selectedAffectedShift.suggestions[selectedIndex];
			if (selectedSuggestion) {
				onStaffAbsenceSuggestionSelected?.({
					shift: selectedAffectedShift.shift,
					suggestion: selectedSuggestion,
				});
			}
		}

		handleRequestClose();
	};

	const handleBack = () => {
		switch (step) {
			case 'helper-candidates':
				setStep('select');
				break;
			case 'datetime-input':
				setStep('select');
				break;
			case 'datetime-candidates':
				setStep('datetime-input');
				break;
			case 'staff-absence-suggestions':
				resetStaffAbsenceState(true);
				setStep('select');
				break;
			default:
				break;
		}
	};

	const renderStepContent = () => {
		switch (step) {
			case 'select':
				return (
					<SelectStep
						onSelectHelperCandidates={() => setStep('helper-candidates')}
						onSelectDatetime={() => setStep('datetime-input')}
						onSelectStaffAbsence={
							staffAbsenceRequest ? handleSelectStaffAbsence : undefined
						}
					/>
				);
			case 'helper-candidates':
				return (
					<StepHelperCandidates
						shiftId={shiftId}
						onComplete={handleAssignedComplete}
						onCascadeReopen={onCascadeReopen}
						requestCandidates={requestHelperCandidates}
						requestAssign={requestHelperAssign}
					/>
				);
			case 'datetime-input':
				return (
					<StepDatetimeInput
						initialStartTime={candidateDatetime.newStartTime}
						initialEndTime={candidateDatetime.newEndTime}
						onShowCandidates={(payload) => {
							setCandidateDatetime(payload);
							setStep('datetime-candidates');
						}}
					/>
				);
			case 'datetime-candidates':
				return (
					<StepDatetimeCandidates
						shiftId={shiftId}
						newStartTime={candidateDatetime.newStartTime}
						newEndTime={candidateDatetime.newEndTime}
						onComplete={handleAssignedComplete}
						onCascadeReopen={onCascadeReopen}
						requestCandidates={requestDatetimeCandidates}
						requestAssign={requestDatetimeAssign}
					/>
				);
			case 'staff-absence-suggestions':
				if (isStaffAbsenceLoading) {
					return <div className="alert alert-info">提案を取得中...</div>;
				}

				if (staffAbsenceError) {
					return <div className="alert alert-error">{staffAbsenceError}</div>;
				}

				if (staffAbsenceSuggestions.length === 0) {
					return (
						<div className="alert alert-warning">提案はありませんでした。</div>
					);
				}

				return (
					<div className="space-y-4">
						{staffAbsenceSuggestions.map((affected) => (
							<section
								key={affected.shift.id}
								className="rounded-lg border border-base-300 p-3"
							>
								<p className="text-sm font-semibold">影響シフト:</p>
								<p className="text-xs text-base-content/70">
									{formatJstDateString(affected.shift.date)}{' '}
									{toTimeLabel(affected.shift.start_time)}-
									{toTimeLabel(affected.shift.end_time)}
								</p>
								<div className="mt-3 space-y-3">
									{affected.suggestions.map((suggestion, index) => {
										const radioId = `${inputIdBase}-${affected.shift.id}-suggestion-${index}`;
										return (
											<label
												key={radioId}
												htmlFor={radioId}
												className="block space-y-2 rounded border border-base-300 p-3"
											>
												<div className="flex items-center gap-2">
													<input
														id={radioId}
														type="radio"
														name={`staff-absence-${affected.shift.id}`}
														className="radio radio-sm"
														checked={
															selectedStaffAbsenceSuggestions[
																affected.shift.id
															] === index
														}
														onChange={() => {
															setSelectedStaffAbsenceSuggestions((prev) => ({
																...prev,
																[affected.shift.id]: index,
															}));
														}}
													/>
													<span className="font-medium">案{index + 1}</span>
												</div>
												<ul className="list-inside list-disc text-sm">
													{suggestion.operations.map(
														(operation, operationIndex) => (
															<li
																key={`${radioId}-operation-${operationIndex}`}
															>
																{toOperationLabel(operation)}
															</li>
														),
													)}
												</ul>
												<ul className="list-inside list-disc text-xs text-base-content/80">
													{suggestion.rationale.map(
														(rationale, rationaleIndex) => (
															<li
																key={`${radioId}-rationale-${rationaleIndex}`}
															>
																{rationale.message}
															</li>
														),
													)}
												</ul>
											</label>
										);
									})}
								</div>
							</section>
						))}
						<div className="flex justify-end">
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleStaffAbsenceComplete}
							>
								確認して閉じる
							</button>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<dialog
			ref={dialogRef}
			className="modal modal-bottom sm:modal-middle"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			onClose={handleDialogClose}
			onCancel={handleDialogCancel}
		>
			<div className="modal-box max-w-2xl">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h2 id={titleId} className="text-xl font-semibold">
							調整相談
						</h2>
						<p id={descriptionId} className="text-sm text-base-content/70">
							実行したい調整方法を選択してください。
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={handleRequestClose}
					>
						✕
					</button>
				</div>

				<div className="mt-4 space-y-4">{renderStepContent()}</div>

				<div className="modal-action">
					{step !== 'select' && (
						<button
							type="button"
							className="btn btn-ghost"
							onClick={handleBack}
						>
							戻る
						</button>
					)}
					<button
						type="button"
						className="btn btn-ghost"
						onClick={handleRequestClose}
					>
						閉じる
					</button>
				</div>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button aria-label="閉じる">close</button>
			</form>
		</dialog>
	);
};
