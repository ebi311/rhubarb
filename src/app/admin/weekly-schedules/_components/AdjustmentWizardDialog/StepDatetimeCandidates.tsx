'use client';

import {
	suggestCandidateStaffForShiftWithNewDatetimeAction,
	updateDatetimeAndAssignWithCascadeUnassignAction,
} from '@/app/actions/shifts';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type {
	AssignStaffWithCascadeOutput,
	CandidateStaff,
	SuggestCandidateStaffForShiftOutput,
	SuggestCandidateStaffForShiftWithNewDatetimeInput,
	UpdateDatetimeAndAssignWithCascadeInput,
} from '@/models/shiftActionSchemas';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const PAGE_SIZE = 5;

type StepDatetimeCandidatesProps = {
	shiftId: string;
	newStartTime: Date;
	newEndTime: Date;
	onComplete: () => void;
	onCascadeReopen?: (shiftIds: string[]) => void;
	requestCandidates?: (
		input: SuggestCandidateStaffForShiftWithNewDatetimeInput,
	) => Promise<ActionResult<SuggestCandidateStaffForShiftOutput>>;
	requestAssign?: (
		input: UpdateDatetimeAndAssignWithCascadeInput,
	) => Promise<ActionResult<AssignStaffWithCascadeOutput>>;
};

const formatTimeValue = (value: { hour: number; minute: number }): string =>
	`${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`;

const formatConflict = (candidate: CandidateStaff): string[] =>
	candidate.conflictingShifts.map(
		(shift) =>
			`${shift.clientName} ${formatTimeValue(shift.startTime)}-${formatTimeValue(shift.endTime)}`,
	);

const getTotalPages = (count: number): number =>
	Math.max(1, Math.ceil(count / PAGE_SIZE));

export const StepDatetimeCandidates = ({
	shiftId,
	newStartTime,
	newEndTime,
	onComplete,
	onCascadeReopen,
	requestCandidates = suggestCandidateStaffForShiftWithNewDatetimeAction,
	requestAssign = updateDatetimeAndAssignWithCascadeUnassignAction,
}: StepDatetimeCandidatesProps) => {
	const [isLoading, setIsLoading] = useState(true);
	const [isAssigningStaffId, setIsAssigningStaffId] = useState<string | null>(
		null,
	);
	const [candidates, setCandidates] = useState<CandidateStaff[]>([]);
	const [page, setPage] = useState(1);

	useEffect(() => {
		let active = true;
		const fetchCandidates = async () => {
			setIsLoading(true);
			try {
				const result = await requestCandidates({
					shiftId,
					newStartTime,
					newEndTime,
				});

				if (!active) return;
				if (result.error || !result.data) {
					toast.error(
						'候補スタッフの取得に失敗しました。時間をおいて再度お試しください。',
					);
					setCandidates([]);
					return;
				}
				setCandidates(result.data.candidates);
				setPage(1);
			} catch {
				if (!active) return;
				toast.error(
					'候補スタッフの取得に失敗しました。時間をおいて再度お試しください。',
				);
				setCandidates([]);
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void fetchCandidates();

		return () => {
			active = false;
		};
	}, [newEndTime, newStartTime, requestCandidates, shiftId]);

	const pagedCandidates = useMemo(() => {
		const from = (page - 1) * PAGE_SIZE;
		return candidates.slice(from, from + PAGE_SIZE);
	}, [candidates, page]);

	const totalPages = getTotalPages(candidates.length);

	const handleAssign = async (staffId: string) => {
		const selectedCandidate = candidates.find(
			(candidate) => candidate.staffId === staffId,
		);
		const selectedStaffName =
			selectedCandidate?.staffName ?? '選択したスタッフ';
		setIsAssigningStaffId(staffId);
		try {
			const result = await requestAssign({
				shiftId,
				newStaffId: staffId,
				newStartTime,
				newEndTime,
			});
			if (result.error || !result.data) {
				toast.error(
					`${selectedStaffName}さんへの日時変更に失敗しました。時間をおいて再度お試しください。`,
				);
				return;
			}
			const cascadedShiftIds = result.data.cascadeUnassignedShiftIds;
			if (cascadedShiftIds.length === 0) {
				toast.success(`${selectedStaffName}さんへの変更を反映しました。`);
			} else {
				toast.warning(
					`${selectedStaffName}さんに変更し、${cascadedShiftIds.length}件のシフトが未割当になりました（クリックで確認）`,
					{ onClick: () => onCascadeReopen?.(cascadedShiftIds) },
				);
			}
			onComplete();
		} catch {
			toast.error(
				`${selectedStaffName}さんへの日時変更に失敗しました。時間をおいて再度お試しください。`,
			);
		} finally {
			setIsAssigningStaffId(null);
		}
	};

	if (isLoading) {
		return (
			<p className="text-sm text-base-content/70">候補スタッフを取得中...</p>
		);
	}

	if (candidates.length === 0) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">候補スタッフを選択</h3>
				<p className="text-sm text-base-content/70">
					候補スタッフが見つかりませんでした。
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">候補スタッフを選択</h3>
			<p className="text-sm text-base-content/70">
				担当したいヘルパーを選択すると、日時変更と再割当を実行します。
			</p>
			<ul className="space-y-2">
				{pagedCandidates.map((candidate) => (
					<li
						key={candidate.staffId}
						className="rounded-lg border border-base-300 p-3"
					>
						<button
							type="button"
							className="btn w-full justify-between btn-outline"
							onClick={() => handleAssign(candidate.staffId)}
							disabled={isAssigningStaffId !== null}
						>
							<span>{candidate.staffName}</span>
							{candidate.conflictingShifts.length > 0 && (
								<span className="badge badge-warning">重複あり</span>
							)}
						</button>
						{candidate.conflictingShifts.length > 0 && (
							<ul className="mt-2 list-disc pl-6 text-sm text-base-content/70">
								{formatConflict(candidate).map((conflict, index) => {
									const conflictShiftId =
										candidate.conflictingShifts[index]?.shiftId ??
										`${candidate.staffId}-${index}`;

									return <li key={conflictShiftId}>{conflict}</li>;
								})}
							</ul>
						)}
					</li>
				))}
			</ul>

			{totalPages > 1 && (
				<div className="flex items-center justify-end gap-2">
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={() => setPage((current) => Math.max(1, current - 1))}
						disabled={page <= 1}
					>
						前の候補
					</button>
					<span className="text-sm text-base-content/70">
						{page} / {totalPages}
					</span>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={() =>
							setPage((current) => Math.min(totalPages, current + 1))
						}
						disabled={page >= totalPages}
					>
						他の候補
					</button>
				</div>
			)}
		</div>
	);
};

export type { StepDatetimeCandidatesProps };
