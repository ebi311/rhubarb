'use client';

import type {
	AiChatMutationBatchProposal,
	AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';
import { useMemo, useState } from 'react';

type Props = {
	proposal: AiChatMutationBatchProposal;
	onConfirm: (proposals: AiChatMutationProposal[]) => void;
	onCancel: () => void;
	isLoading?: boolean;
};

const OPERATION_LABELS: Record<AiChatMutationProposal['type'], string> = {
	change_shift_staff: '担当者変更',
	update_shift_time: '時間変更',
};

const createProposalDescription = (
	proposal: AiChatMutationProposal,
): string => {
	if (proposal.type === 'change_shift_staff') {
		return `shiftId: ${proposal.shiftId} / toStaffId: ${proposal.toStaffId}`;
	}

	return `${proposal.startAt} → ${proposal.endAt}`;
};

export const BatchProposalConfirmCard = ({
	proposal,
	onConfirm,
	onCancel,
	isLoading = false,
}: Props) => {
	const [approvedIndexes, setApprovedIndexes] = useState<
		Record<number, boolean>
	>({});

	const approvedProposals = useMemo(
		() =>
			proposal.proposals.filter((_, index) => approvedIndexes[index] !== false),
		[approvedIndexes, proposal.proposals],
	);
	const isConfirmDisabled = isLoading || approvedProposals.length === 0;

	return (
		<div className="card border border-info/30 bg-base-100">
			<div className="card-body gap-4">
				<div className="space-y-1">
					<h3 className="card-title text-base text-info">一括変更提案</h3>
					<p className="text-sm text-base-content/70">
						{proposal.proposals.length}
						件の提案があります。適用する内容を選んでください。
					</p>
				</div>

				<div className="space-y-3">
					{proposal.proposals.map((item, index) => {
						const isChecked = approvedIndexes[index] !== false;

						return (
							<label
								key={`${item.shiftId}-${index}`}
								className="flex cursor-pointer gap-3 rounded-lg border border-base-300 p-3"
							>
								<input
									type="checkbox"
									className="checkbox mt-1 checkbox-sm checkbox-primary"
									checked={isChecked}
									onChange={(event) => {
										setApprovedIndexes((current) => ({
											...current,
											[index]: event.target.checked,
										}));
									}}
									disabled={isLoading}
									aria-label={`${index + 1}件目の提案を承認`}
								/>
								<div className="space-y-1 text-sm">
									<p className="font-semibold">{OPERATION_LABELS[item.type]}</p>
									<p className="break-all text-base-content/80">
										{createProposalDescription(item)}
									</p>
									<p className="text-base-content/70">
										理由: {item.reason ?? '（理由なし）'}
									</p>
								</div>
							</label>
						);
					})}
				</div>

				<div className="card-actions justify-end gap-2">
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={onCancel}
						disabled={isLoading}
					>
						キャンセル
					</button>
					<button
						type="button"
						className="btn btn-sm btn-primary"
						onClick={() => onConfirm(approvedProposals)}
						disabled={isConfirmDisabled}
					>
						確定
					</button>
				</div>
			</div>
		</div>
	);
};
