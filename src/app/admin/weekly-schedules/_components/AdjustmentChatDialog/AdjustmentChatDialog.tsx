'use client';

import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useMemo, useState } from 'react';
import { buildProposalDisplayValues } from './buildProposalDisplayValues';
import { ChatInput } from './ChatInput';
import { ChatMessageList } from './ChatMessageList';
import { parseProposal } from './parseProposal';
import { ProposalConfirmCard } from './ProposalConfirmCard';
import type { ShiftContext } from './useAdjustmentChat';
import { useAdjustmentChat } from './useAdjustmentChat';
import { useProposalExecution } from './useProposalExecution';

type AdjustmentChatDialogProps = {
	isOpen: boolean;
	shiftContext: ShiftContext;
	staffOptions: StaffPickerOption[];
	onClose: () => void;
};

export const AdjustmentChatDialog = ({
	isOpen,
	shiftContext,
	staffOptions,
	onClose,
}: AdjustmentChatDialogProps) => {
	const { messages, isStreaming, error, sendMessage, stop } = useAdjustmentChat(
		{
			shiftContext,
		},
	);

	const staffIdsAllowlist = useMemo(
		() => staffOptions.map((staffOption) => staffOption.id),
		[staffOptions],
	);
	const allowlist = useMemo(
		() => ({
			shiftIds: [shiftContext.id],
			staffIds: staffIdsAllowlist,
		}),
		[shiftContext.id, staffIdsAllowlist],
	);

	const detectedProposal = useMemo(() => {
		let latestAssistantMessage: (typeof messages)[number] | null = null;

		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];

			if (message.role === 'assistant') {
				latestAssistantMessage = message;
				break;
			}
		}

		if (!latestAssistantMessage?.content) {
			return null;
		}

		return parseProposal(latestAssistantMessage.content, allowlist);
	}, [messages, allowlist]);

	const proposalDisplayValues = useMemo(() => {
		if (!detectedProposal) {
			return null;
		}

		return buildProposalDisplayValues({
			proposal: detectedProposal,
			shiftContext,
			staffOptions,
		});
	}, [detectedProposal, shiftContext, staffOptions]);

	const proposalKey = useMemo(
		() => (detectedProposal ? JSON.stringify(detectedProposal) : null),
		[detectedProposal],
	);
	const [dismissedProposalKey, setDismissedProposalKey] = useState<
		string | null
	>(null);
	const isDismissed =
		proposalKey !== null && proposalKey === dismissedProposalKey;

	const { execute, dismiss, isExecuting } = useProposalExecution({
		proposal: detectedProposal,
		allowlist,
		onDismiss: () => setDismissedProposalKey(proposalKey),
	});

	const handleClose = () => {
		stop(); // ストリーミング中止
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			className="modal-open modal modal-bottom sm:modal-middle"
			aria-modal="true"
			aria-labelledby="adjustment-chat-dialog-title"
		>
			<div className="modal-box flex h-[80vh] max-w-2xl flex-col">
				{/* ヘッダー */}
				<div className="flex items-start justify-between gap-2 border-b border-base-300 pb-3">
					<div>
						<h2
							id="adjustment-chat-dialog-title"
							className="text-xl font-semibold"
						>
							シフト調整チャット
						</h2>
						<p className="text-sm text-base-content/70">
							AIアシスタントがシフト調整をサポートします
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={handleClose}
					>
						✕
					</button>
				</div>

				{/* シフトコンテキスト */}
				<div className="border-b border-base-300 bg-base-200/50 px-4 py-2 text-sm">
					<span className="font-medium">対象シフト: </span>
					<span>
						{shiftContext.clientName ?? '(利用者不明)'} /{' '}
						{shiftContext.staffName ?? '(未割当)'} / {shiftContext.date}{' '}
						{shiftContext.startTime}〜{shiftContext.endTime}
					</span>
				</div>

				{/* エラー表示 */}
				{error && <div className="m-4 alert alert-error">{error}</div>}

				{/* 提案検出表示 */}
				{detectedProposal && !isDismissed && proposalDisplayValues && (
					<div className="mx-4 mt-4">
						<ProposalConfirmCard
							proposal={detectedProposal}
							beforeValue={proposalDisplayValues.beforeValue}
							afterValue={proposalDisplayValues.afterValue}
							isStreaming={isStreaming}
							isExecuting={isExecuting}
							onConfirm={execute}
							onDismiss={dismiss}
						/>
					</div>
				)}

				{/* メッセージリスト */}
				<ChatMessageList messages={messages} isStreaming={isStreaming} />

				{/* 入力エリア */}
				<div className="border-t border-base-300 pt-3">
					<ChatInput onSend={sendMessage} disabled={isStreaming} />
				</div>
			</div>
		</div>
	);
};
