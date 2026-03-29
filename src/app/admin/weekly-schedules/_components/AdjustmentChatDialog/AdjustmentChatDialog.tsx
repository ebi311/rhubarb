'use client';

import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { type ReactNode, useMemo, useState } from 'react';
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

/**
 * 末尾側で最初に見つかる assistant メッセージ 1 件だけを対象に proposal を検出する。
 * 最新 assistant に proposal が無い場合は null を返し、過去提案へはフォールバックしない。
 */
const findLatestProposal = (
	messages: Array<{ id: string; role: string; content: string }>,
	allowlist: Parameters<typeof parseProposal>[1],
) => {
	let latestAssistantMessage: {
		id: string;
		role: string;
		content: string;
	} | null = null;

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

	const proposal = parseProposal(latestAssistantMessage.content, allowlist);

	if (!proposal) {
		return null;
	}

	return { messageId: latestAssistantMessage.id, proposal };
};

type ProposalSectionProps = {
	detectedProposal: NonNullable<ReturnType<typeof parseProposal>>;
	proposalDisplayValues: NonNullable<
		ReturnType<typeof buildProposalDisplayValues>
	>;
	isStreaming: boolean;
	isExecuting: boolean;
	onConfirm: () => Promise<void>;
	onDismiss: () => void;
};

const renderErrorAlert = (error: string | null) =>
	error ? <div className="m-4 alert alert-error">{error}</div> : null;

const renderProposalSection = ({
	detectedProposal,
	proposalDisplayValues,
	isStreaming,
	isExecuting,
	onConfirm,
	onDismiss,
}: ProposalSectionProps) => {
	return (
		<div className="mx-4 mt-4">
			<ProposalConfirmCard
				proposal={detectedProposal}
				beforeValue={proposalDisplayValues.beforeValue}
				afterValue={proposalDisplayValues.afterValue}
				isStreaming={isStreaming}
				isExecuting={isExecuting}
				onConfirm={onConfirm}
				onDismiss={onDismiss}
			/>
		</div>
	);
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

	/** 最新の assistant メッセージ（id + parsed proposal）を返す */
	const { detectedProposal, proposalKey } = useMemo(() => {
		const result = findLatestProposal(messages, allowlist);

		return {
			detectedProposal: result ? result.proposal : null,
			// dismiss キーは「この assistant メッセージの id」で安定管理する
			proposalKey: result ? result.messageId : null,
		};
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
	const [dismissedProposalKey, setDismissedProposalKey] = useState<
		string | null
	>(null);
	const isDismissed =
		proposalKey !== null && proposalKey === dismissedProposalKey;

	const { execute, dismiss, isExecuting } = useProposalExecution({
		proposal: detectedProposal,
		allowlist,
		onSuccess: () => setDismissedProposalKey(proposalKey),
		onDismiss: () => setDismissedProposalKey(proposalKey),
	});

	const handleClose = () => {
		stop(); // ストリーミング中止
		onClose();
	};

	let proposalMessageId: string | null = null;
	let proposalSection: ReactNode = null;

	if (
		detectedProposal !== null &&
		!isDismissed &&
		proposalDisplayValues !== null
	) {
		proposalMessageId = proposalKey;
		proposalSection = renderProposalSection({
			detectedProposal,
			proposalDisplayValues,
			isStreaming,
			isExecuting,
			onConfirm: execute,
			onDismiss: dismiss,
		});
	}

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
				{renderErrorAlert(error)}

				{/* 提案検出表示 */}
				{proposalSection}

				{/* メッセージリスト */}
				<ChatMessageList
					messages={messages}
					isStreaming={isStreaming}
					proposalMessageId={proposalMessageId}
				/>

				{/* 入力エリア */}
				<div className="border-t border-base-300 pt-3">
					<ChatInput onSend={sendMessage} disabled={isStreaming} />
				</div>
			</div>
		</div>
	);
};
