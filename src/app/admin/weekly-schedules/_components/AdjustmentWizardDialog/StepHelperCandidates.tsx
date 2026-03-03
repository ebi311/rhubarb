'use client';

import {
	assignStaffWithCascadeUnassignAction,
	suggestCandidateStaffForShiftAction,
} from '@/app/actions/shifts';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	AssignStaffWithCascadeInput,
	AssignStaffWithCascadeOutput,
	CandidateStaff,
	SuggestCandidateStaffForShiftInput,
	SuggestCandidateStaffForShiftOutput,
} from '@/models/shiftActionSchemas';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const PAGE_SIZE = 5;
type StepHelperCandidatesProps = {
	shiftId: string;
	onComplete: () => void;
	onCascadeReopen?: (shiftIds: string[]) => void;
	requestCandidates?: (
		input: SuggestCandidateStaffForShiftInput,
	) => Promise<ActionResult<SuggestCandidateStaffForShiftOutput>>;
	requestAssign?: (
		input: AssignStaffWithCascadeInput,
	) => Promise<ActionResult<AssignStaffWithCascadeOutput>>;
};

const formatTimeValue = (value: { hour: number; minute: number }): string =>
	`${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`;

const formatConflict = (candidate: CandidateStaff): string[] =>
	candidate.conflictingShifts.map(
		(shift) =>
			`${shift.clientName} ${shift.date} ${formatTimeValue(shift.startTime)}-${formatTimeValue(
				shift.endTime,
			)}`,
	);

const getTotalPages = (count: number): number =>
	Math.max(1, Math.ceil(count / PAGE_SIZE));

export const StepHelperCandidates = ({
	shiftId,
	onComplete,
	onCascadeReopen,
	requestCandidates = suggestCandidateStaffForShiftAction,
	requestAssign = assignStaffWithCascadeUnassignAction,
}: StepHelperCandidatesProps) => {
	const [isLoading, setIsLoading] = useState(true);
	const [isAssigningStaffId, setIsAssigningStaffId] = useState<string | null>(
		null,
	);
	const [candidates, setCandidates] = useState<CandidateStaff[]>([]);
	const [page, setPage] = useState(1);
	const { handleActionResult } = useActionResultHandler();

	useEffect(() => {
		let active = true;

		const fetchCandidates = async () => {
			setIsLoading(true);
			try {
				const result = await requestCandidates({ shiftId });

				if (!active) return;

				const success = handleActionResult(result, {
					errorMessage:
						'候補ヘルパーの取得に失敗しました。時間をおいて再度お試しください。',
				});
				if (!success || !result.data) {
					setCandidates([]);
					return;
				}

				setCandidates(result.data.candidates);
				setPage(1);
			} catch {
				if (!active) return;
				handleActionResult(
					{
						data: null,
						error: 'Failed to fetch candidates',
						status: 500,
					},
					{
						errorMessage:
							'候補ヘルパーの取得に失敗しました。時間をおいて再度お試しください。',
					},
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
	}, [handleActionResult, requestCandidates, shiftId]);

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
			const result = await requestAssign({ shiftId, newStaffId: staffId });
			const success = handleActionResult(result, {
				errorMessage: `${selectedStaffName}さんへのヘルパー変更に失敗しました。時間をおいて再度お試しください。`,
				onSuccess: (data) => {
					if (!data) return;
					const cascadedShiftIds = data.cascadeUnassignedShiftIds;
					if (cascadedShiftIds.length === 0) {
						toast.success(
							`${selectedStaffName}さんを候補に確定しました（まだ保存されていません）。`,
						);
						return;
					}
					toast.warning(
						`${selectedStaffName}さんを候補に確定し、${cascadedShiftIds.length}件の未割当候補があります（クリックで確認）`,
						{
							onClick: () => onCascadeReopen?.(cascadedShiftIds),
						},
					);
				},
			});
			if (!success) return;
			onComplete();
		} catch {
			handleActionResult(
				{
					data: null,
					error: 'Failed to assign staff',
					status: 500,
				},
				{
					errorMessage: `${selectedStaffName}さんへのヘルパー変更に失敗しました。時間をおいて再度お試しください。`,
				},
			);
		} finally {
			setIsAssigningStaffId(null);
		}
	};

	if (isLoading) {
		return (
			<p className="text-sm text-base-content/70">候補ヘルパーを取得中...</p>
		);
	}

	if (candidates.length === 0) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">ヘルパー候補を選択</h3>
				<p className="text-sm text-base-content/70">
					候補ヘルパーが見つかりませんでした。
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">ヘルパー候補を選択</h3>
			<p className="text-sm text-base-content/70">
				担当したいヘルパーを選択すると、候補として確定します（保存はまだ行いません）。
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
						{candidate.conflictingShifts.length > 0 &&
							(() => {
								const conflicts = formatConflict(candidate);
								return (
									<ul className="mt-2 list-disc pl-6 text-sm text-base-content/70">
										{candidate.conflictingShifts.map((conflict, index) => (
											<li key={conflict.shiftId}>{conflicts[index]}</li>
										))}
									</ul>
								);
							})()}
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

export type { StepHelperCandidatesProps };
