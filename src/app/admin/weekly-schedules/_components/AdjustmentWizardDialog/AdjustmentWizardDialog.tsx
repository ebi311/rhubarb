'use client';

import { type SyntheticEvent, useEffect, useId, useRef, useState } from 'react';
import { StepDatetimeCandidates } from './StepDatetimeCandidates';
import { StepDatetimeInput } from './StepDatetimeInput';
import { StepHelperCandidates } from './StepHelperCandidates';

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

type AdjustmentWizardDialogProps = {
	isOpen: boolean;
	shiftId: string;
	initialStartTime: Date;
	initialEndTime: Date;
	onClose: () => void;
	onAssigned?: () => void;
	onCascadeReopen?: (shiftIds: string[]) => void;
};

export const AdjustmentWizardDialog = ({
	isOpen,
	shiftId,
	initialStartTime,
	initialEndTime,
	onClose,
	onAssigned,
	onCascadeReopen,
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
		onClose();
	};

	const handleDialogClose = () => {
		setStep('select');
		if (isOpen) {
			onClose();
		}
	};

	const handleDialogCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
		event.preventDefault();
		setStep('select');
		onClose();
	};

	const handleAssignedComplete = () => {
		onAssigned?.();
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
