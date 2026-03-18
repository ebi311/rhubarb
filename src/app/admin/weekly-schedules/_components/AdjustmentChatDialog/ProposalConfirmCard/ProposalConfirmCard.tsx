import type { AiChatMutationProposal } from '@/models/aiChatMutationProposal';

type ProposalConfirmCardProps = {
	proposal: AiChatMutationProposal;
	beforeValue: string;
	afterValue: string;
	isStreaming?: boolean;
	isExecuting?: boolean;
	onConfirm: () => void;
	onDismiss: () => void;
};

const getOperationLabel = (
	proposalType: AiChatMutationProposal['type'],
): string => {
	switch (proposalType) {
		case 'change_shift_staff':
			return '担当者変更';
		case 'update_shift_time':
			return '時間変更';
	}
};

export const ProposalConfirmCard = ({
	proposal,
	beforeValue,
	afterValue,
	isStreaming = false,
	isExecuting = false,
	onConfirm,
	onDismiss,
}: ProposalConfirmCardProps) => {
	const isConfirmDisabled = isStreaming || isExecuting;

	return (
		<div className="rounded-lg border border-info/30 bg-base-100 p-4">
			<p className="text-sm font-semibold text-info">
				{getOperationLabel(proposal.type)}
			</p>
			<div className="mt-3 space-y-2 text-sm">
				<div className="grid grid-cols-[56px_1fr] gap-x-2">
					<span className="text-base-content/70">Before</span>
					<span className="font-medium">{beforeValue}</span>
				</div>
				<div className="grid grid-cols-[56px_1fr] gap-x-2">
					<span className="text-base-content/70">After</span>
					<span className="font-medium">{afterValue}</span>
				</div>
				<div className="grid grid-cols-[56px_1fr] gap-x-2">
					<span className="text-base-content/70">Reason</span>
					<span>{proposal.reason ?? '（理由なし）'}</span>
				</div>
			</div>
			<div className="mt-4 flex justify-end gap-2">
				<button
					type="button"
					className="btn btn-ghost btn-sm"
					onClick={onDismiss}
				>
					Dismiss
				</button>
				<button
					type="button"
					className="btn btn-sm btn-primary"
					onClick={onConfirm}
					disabled={isConfirmDisabled}
				>
					Confirm
				</button>
			</div>
		</div>
	);
};
