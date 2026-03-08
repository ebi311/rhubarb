'use client';

import {
	assignStaffWithCascadeUnassignAction,
	suggestCandidateStaffForShiftAction,
	suggestCandidateStaffForShiftWithNewDatetimeAction,
	updateDatetimeAndAssignWithCascadeUnassignAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { errorResult, successResult } from '@/app/actions/utils/actionResult';
import { formatJstDateString, getJstHours, getJstMinutes } from '@/utils/date';
import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
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
	| 'datetime-candidates';

const SelectStep = ({
	onSelectHelperCandidates,
	onSelectDatetime,
}: {
	onSelectHelperCandidates: () => void;
	onSelectDatetime: () => void;
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

export type AdjustmentWizardMockApi = {
	assignStaffWithCascadeUnassign: NonNullable<
		StepHelperCandidatesProps['requestAssign']
	>;
	updateDatetimeAndAssignWithCascadeUnassign: NonNullable<
		StepDatetimeCandidatesProps['requestAssign']
	>;
};

type AdjustmentWizardDialogProps = {
	isOpen: boolean;
	shiftId: string;
	initialStartTime: Date;
	initialEndTime: Date;
	onClose: () => void;
	onAssigned?: (suggestion: AdjustmentWizardSuggestion) => void;
	onCascadeReopen?: (shiftIds: string[]) => void;
	mockApi?: Partial<AdjustmentWizardMockApi>;
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

export const AdjustmentWizardDialog = ({
	isOpen,
	shiftId,
	initialStartTime,
	initialEndTime,
	onClose,
	onAssigned,
	onCascadeReopen,
	mockApi,
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

	const requestHelperCandidates = useCallback<
		NonNullable<StepHelperCandidatesProps['requestCandidates']>
	>(
		async ({ shiftId: targetShiftId }) =>
			buildCandidates(targetShiftId, initialStartTime, initialEndTime),
		[initialEndTime, initialStartTime],
	);

	// mockApi の有無にかかわらずラッパーを作成し、selectedSuggestionRef を更新
	// これにより onAssigned コールバックに正しいデータが渡される
	const requestHelperAssign = useMemo<
		StepHelperCandidatesProps['requestAssign']
	>(() => {
		const assignFn =
			mockApi?.assignStaffWithCascadeUnassign ??
			assignStaffWithCascadeUnassignAction;
		return async ({ shiftId: targetShiftId, newStaffId }) => {
			selectedSuggestionRef.current = {
				shiftId: targetShiftId,
				newStaffId,
				newStartTime: initialStartTime,
				newEndTime: initialEndTime,
			};
			return assignFn({ shiftId: targetShiftId, newStaffId });
		};
	}, [
		initialEndTime,
		initialStartTime,
		mockApi?.assignStaffWithCascadeUnassign,
	]);

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

	// mockApi の有無にかかわらずラッパーを作成し、selectedSuggestionRef を更新
	// これにより onAssigned コールバックに正しいデータが渡される
	const requestDatetimeAssign = useMemo<
		StepDatetimeCandidatesProps['requestAssign']
	>(() => {
		const assignFn =
			mockApi?.updateDatetimeAndAssignWithCascadeUnassign ??
			updateDatetimeAndAssignWithCascadeUnassignAction;
		return async ({
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
			return assignFn({
				shiftId: targetShiftId,
				newStaffId,
				newStartTime,
				newEndTime,
			});
		};
	}, [mockApi?.updateDatetimeAndAssignWithCascadeUnassign]);

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
			selectedSuggestionRef.current = null;
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, [initialEndTime, initialStartTime, isOpen, shiftId]);

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
		selectedSuggestionRef.current = null;
		onClose();
	};

	const handleDialogClose = () => {
		setStep('select');
		selectedSuggestionRef.current = null;
		if (isOpen) {
			onClose();
		}
	};

	const handleDialogCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
		event.preventDefault();
		setStep('select');
		selectedSuggestionRef.current = null;
		onClose();
	};

	const handleAssignedComplete = () => {
		if (selectedSuggestionRef.current) {
			onAssigned?.(selectedSuggestionRef.current);
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
