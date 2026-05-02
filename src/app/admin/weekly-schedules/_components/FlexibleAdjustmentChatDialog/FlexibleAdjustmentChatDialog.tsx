'use client';

import { executeAiChatMutationBatchAction } from '@/app/actions/aiChatMutationBatch';
import {
	BatchProposalConfirmCard,
	ChatInput,
	ChatMessageList,
	extractProposalFromParts,
	parseProposal,
	useAdjustmentChat,
	type FlexibleChatContext,
} from '@/app/admin/weekly-schedules/_components/AdjustmentChatDialog';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	AiChatMutationBatchProposal,
	ProposalAllowlist,
} from '@/models/aiChatMutationProposal';
import type { UIMessage } from 'ai';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type MutableRefObject } from 'react';

type FlexibleAdjustmentChatDialogProps = {
	isOpen: boolean;
	weekRange: FlexibleChatContext['weekRange'];
	allowlist: ProposalAllowlist;
	onClose: () => void;
};

const SUCCESS_MESSAGE = '提案を適用しました';
const DEFAULT_ERROR_MESSAGE = '提案の適用に失敗しました';
const CONFLICT_ERROR_MESSAGE =
	'シフトが競合しているため提案を適用できません。最新の状態を確認してください。';

const findLatestProposal = (
	messages: UIMessage[],
	allowlist: ProposalAllowlist,
): { messageId: string; proposal: AiChatMutationBatchProposal } | null => {
	let latestAssistantMessage: UIMessage | null = null;

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role === 'assistant') {
			latestAssistantMessage = message;
			break;
		}
	}

	if (!latestAssistantMessage) {
		return null;
	}

	const proposalFromTool = extractProposalFromParts(
		latestAssistantMessage.parts,
		allowlist,
	);

	if (proposalFromTool) {
		return {
			messageId: latestAssistantMessage.id,
			proposal:
				proposalFromTool.type === 'batch'
					? proposalFromTool.proposal
					: { proposals: [proposalFromTool.proposal] },
		};
	}

	const textContent = latestAssistantMessage.parts
		.filter(
			(part): part is Extract<UIMessage['parts'][number], { type: 'text' }> =>
				part.type === 'text',
		)
		.map((part) => part.text)
		.join('');

	if (!textContent) {
		return null;
	}

	const proposal = parseProposal(textContent, allowlist);
	if (!proposal) {
		return null;
	}

	return {
		messageId: latestAssistantMessage.id,
		proposal: { proposals: [proposal] },
	};
};

const renderErrorAlert = (error: string | null) =>
	error ? <div className="m-4 alert alert-error">{error}</div> : null;

type ProposalSectionProps = {
	proposal: AiChatMutationBatchProposal;
	proposalKey: string;
	isExecuting: boolean;
	onConfirm: (
		approvedProposals: AiChatMutationBatchProposal['proposals'],
	) => void;
	onDismiss: () => void;
};

const ProposalSection = ({
	proposal,
	proposalKey,
	isExecuting,
	onConfirm,
	onDismiss,
}: ProposalSectionProps) => (
	<div className="mx-4 mt-4">
		<BatchProposalConfirmCard
			key={proposalKey}
			proposal={proposal}
			isLoading={isExecuting}
			onConfirm={onConfirm}
			onCancel={onDismiss}
		/>
	</div>
);

const createFallbackErrorResult = () => ({
	data: null,
	error: DEFAULT_ERROR_MESSAGE,
	status: 500,
});

const executeBatchProposal = async ({
	approvedProposals,
	allowlist,
	proposalKey,
	handleActionResult,
	router,
	isExecutingRef,
	setIsExecuting,
	setDismissedProposalKey,
}: {
	approvedProposals: AiChatMutationBatchProposal['proposals'];
	allowlist: ProposalAllowlist;
	proposalKey: string | null;
	handleActionResult: ReturnType<
		typeof useActionResultHandler
	>['handleActionResult'];
	router: ReturnType<typeof useRouter>;
	isExecutingRef: MutableRefObject<boolean>;
	setIsExecuting: (value: boolean) => void;
	setDismissedProposalKey: (value: string | null) => void;
}) => {
	if (approvedProposals.length === 0 || isExecutingRef.current) {
		return;
	}

	isExecutingRef.current = true;
	setIsExecuting(true);

	try {
		const result = await executeAiChatMutationBatchAction({
			proposals: approvedProposals,
			allowlist,
		});

		handleActionResult(result, {
			successMessage: SUCCESS_MESSAGE,
			errorMessage:
				result.status === 409 ? CONFLICT_ERROR_MESSAGE : DEFAULT_ERROR_MESSAGE,
			onSuccess: () => {
				router.refresh();
				setDismissedProposalKey(proposalKey);
			},
		});
	} catch {
		handleActionResult(createFallbackErrorResult(), {
			errorMessage: DEFAULT_ERROR_MESSAGE,
		});
	} finally {
		isExecutingRef.current = false;
		setIsExecuting(false);
	}
};

const useFlexibleProposalExecution = ({
	allowlist,
	proposalKey,
	setDismissedProposalKey,
}: {
	allowlist: ProposalAllowlist;
	proposalKey: string | null;
	setDismissedProposalKey: (value: string | null) => void;
}) => {
	const router = useRouter();
	const { handleActionResult } = useActionResultHandler();
	const [isExecuting, setIsExecuting] = useState(false);
	const isExecutingRef = useRef(false);

	const handleConfirm = (
		approvedProposals: AiChatMutationBatchProposal['proposals'],
	) =>
		void executeBatchProposal({
			approvedProposals,
			allowlist,
			proposalKey,
			handleActionResult,
			router,
			isExecutingRef,
			setIsExecuting,
			setDismissedProposalKey,
		});

	return {
		isExecuting,
		handleConfirm,
	};
};

const useFlexibleProposalState = ({
	rawMessages,
	allowlist,
	dismissedProposalKey,
	isExecuting,
	handleConfirm,
	setDismissedProposalKey,
}: {
	rawMessages: UIMessage[];
	allowlist: ProposalAllowlist;
	dismissedProposalKey: string | null;
	isExecuting: boolean;
	handleConfirm: (
		approvedProposals: AiChatMutationBatchProposal['proposals'],
	) => void;
	setDismissedProposalKey: (value: string | null) => void;
}) => {
	const latestProposal = useMemo(
		() => findLatestProposal(rawMessages, allowlist),
		[allowlist, rawMessages],
	);
	const proposalKey = latestProposal?.messageId ?? null;
	const detectedProposal = latestProposal?.proposal ?? null;
	const isDismissed =
		proposalKey !== null && proposalKey === dismissedProposalKey;
	const shouldShowProposal =
		detectedProposal !== null && !isDismissed && proposalKey !== null;

	return {
		proposalMessageId: shouldShowProposal ? proposalKey : null,
		proposalSection: shouldShowProposal ? (
			<ProposalSection
				proposal={detectedProposal}
				proposalKey={proposalKey}
				isExecuting={isExecuting}
				onConfirm={handleConfirm}
				onDismiss={() => setDismissedProposalKey(proposalKey)}
			/>
		) : null,
	};
};

export const FlexibleAdjustmentChatDialog = ({
	isOpen,
	weekRange,
	allowlist,
	onClose,
}: FlexibleAdjustmentChatDialogProps) => {
	const [dismissedProposalKey, setDismissedProposalKey] = useState<
		string | null
	>(null);

	const { messages, rawMessages, isStreaming, error, sendMessage, stop } =
		useAdjustmentChat({
			context: {
				mode: 'flexible',
				weekRange,
			},
		});

	const latestProposal = useMemo(
		() => findLatestProposal(rawMessages, allowlist),
		[allowlist, rawMessages],
	);
	const proposalKey = latestProposal?.messageId ?? null;
	const { isExecuting, handleConfirm } = useFlexibleProposalExecution({
		allowlist,
		proposalKey,
		setDismissedProposalKey,
	});
	const { proposalMessageId, proposalSection } = useFlexibleProposalState({
		rawMessages,
		allowlist,
		dismissedProposalKey,
		isExecuting,
		handleConfirm,
		setDismissedProposalKey,
	});

	if (!isOpen) {
		return null;
	}

	return (
		<div
			role="dialog"
			className="modal-open modal modal-bottom sm:modal-middle"
			aria-modal="true"
			aria-labelledby="flexible-adjustment-chat-dialog-title"
		>
			<div className="modal-box flex h-[80vh] max-w-3xl flex-col">
				<div className="flex items-start justify-between gap-2 border-b border-base-300 pb-3">
					<div>
						<h2
							id="flexible-adjustment-chat-dialog-title"
							className="text-xl font-semibold"
						>
							AIアシスタント
						</h2>
						<p className="text-sm text-base-content/70">
							複数シフトの調整案を会話しながらまとめて提案します
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={() => {
							stop();
							onClose();
						}}
					>
						✕
					</button>
				</div>

				<div className="border-b border-base-300 bg-base-200/50 px-4 py-2 text-sm">
					<span className="font-medium">対象期間: </span>
					<span>
						{weekRange.startDate} 〜 {weekRange.endDate}
					</span>
				</div>

				{renderErrorAlert(error)}
				{proposalSection}

				<ChatMessageList
					messages={messages}
					isStreaming={isStreaming}
					proposalMessageId={proposalMessageId}
				/>

				<div className="border-t border-base-300 pt-3">
					<ChatInput
						onSend={sendMessage}
						disabled={isStreaming || isExecuting}
					/>
				</div>
			</div>
		</div>
	);
};
