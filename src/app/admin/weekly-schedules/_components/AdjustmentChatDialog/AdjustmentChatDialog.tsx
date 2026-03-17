'use client';

import { useMemo } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessageList } from './ChatMessageList';
import { parseProposal } from './parseProposal';
import type { ShiftContext } from './useAdjustmentChat';
import { useAdjustmentChat } from './useAdjustmentChat';

type AdjustmentChatDialogProps = {
	isOpen: boolean;
	shiftContext: ShiftContext;
	staffIdsAllowlist: string[];
	onClose: () => void;
};

export const AdjustmentChatDialog = ({
	isOpen,
	shiftContext,
	staffIdsAllowlist,
	onClose,
}: AdjustmentChatDialogProps) => {
	const { messages, isStreaming, error, sendMessage, stop } = useAdjustmentChat(
		{
			shiftContext,
		},
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

		return parseProposal(latestAssistantMessage.content, {
			shiftIds: [shiftContext.id],
			staffIds: staffIdsAllowlist,
		});
	}, [messages, shiftContext.id, staffIdsAllowlist]);

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
				{detectedProposal && (
					<div className="mx-4 mt-4 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info-content">
						提案を検出しました（確定は次のステップで行います）
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
