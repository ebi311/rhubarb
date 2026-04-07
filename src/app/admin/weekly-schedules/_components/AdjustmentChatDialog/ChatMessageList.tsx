'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './useAdjustmentChat';

type ChatMessageListProps = {
	messages: ChatMessage[];
	isStreaming?: boolean;
	proposalMessageId?: string | null;
};

const PROPOSAL_PLACEHOLDER_TEXT = '（提案を生成しました）';
const JSON_CODE_BLOCK_REGEX = /```json\s*[\s\S]*?\s*```/gi;
const JSON_CODE_BLOCK_DETECT_REGEX = /```json\s*[\s\S]*?\s*```/i;

const getAssistantContentWithoutJsonBlock = (content: string): string =>
	content.replace(JSON_CODE_BLOCK_REGEX, '').trim();

const shouldHideProposalPlaceholderMessage = (
	message: ChatMessage,
	proposalMessageId?: string | null,
): boolean => {
	if (!proposalMessageId || message.id !== proposalMessageId) {
		return false;
	}

	if (message.content.trim().length === 0) {
		return true;
	}

	const hasJsonCodeBlock = JSON_CODE_BLOCK_DETECT_REGEX.test(message.content);
	if (!hasJsonCodeBlock) {
		return false;
	}

	return getAssistantContentWithoutJsonBlock(message.content).length === 0;
};

const getAssistantDisplayContent = (content: string): string | null => {
	if (content.trim().length === 0) {
		return null;
	}

	const hasJsonCodeBlock = JSON_CODE_BLOCK_DETECT_REGEX.test(content);
	const contentWithoutJsonBlock = getAssistantContentWithoutJsonBlock(content);

	if (contentWithoutJsonBlock.length > 0) {
		return contentWithoutJsonBlock;
	}

	if (hasJsonCodeBlock) {
		return PROPOSAL_PLACEHOLDER_TEXT;
	}

	return null;
};

const getMessageDisplayContent = (message: ChatMessage): string | null => {
	if (message.role === 'assistant') {
		return getAssistantDisplayContent(message.content);
	}

	return message.content;
};

/**
 * assistant メッセージを描画すべきかどうかを返す。
 * - shouldHideProposalPlaceholderMessage が true の場合は非表示
 * - ストリーミング中の最終メッセージ以外で displayContent が null の場合も非表示
 *   (tool-only メッセージが loading dots を永続表示しないようにする)
 */
const shouldRenderMessage = (
	message: ChatMessage,
	displayContent: string | null,
	proposalMessageId: string | null | undefined,
	isStreaming: boolean,
	isLastMessage: boolean,
): boolean => {
	if (shouldHideProposalPlaceholderMessage(message, proposalMessageId)) {
		return false;
	}
	if (
		message.role === 'assistant' &&
		displayContent === null &&
		!(isStreaming && isLastMessage)
	) {
		return false;
	}
	return true;
};

export const ChatMessageList = ({
	messages,
	isStreaming = false,
	proposalMessageId = null,
}: ChatMessageListProps) => {
	const endRef = useRef<HTMLDivElement>(null);
	const prevMessageCountRef = useRef(0);

	// 自動スクロール
	useEffect(() => {
		const hasNewMessage = messages.length > prevMessageCountRef.current;

		if (typeof endRef.current?.scrollIntoView === 'function') {
			if (isStreaming) {
				endRef.current.scrollIntoView({ behavior: 'auto' });
			} else if (hasNewMessage) {
				endRef.current.scrollIntoView({ behavior: 'smooth' });
			}
		}

		prevMessageCountRef.current = messages.length;
	}, [messages, isStreaming]);

	if (messages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center text-base-content/50">
				メッセージを入力してチャットを開始してください
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-4 overflow-y-auto p-4">
			{messages.map((message, index) => {
				const displayContent = getMessageDisplayContent(message);
				const isLastMessage = index === messages.length - 1;

				if (
					!shouldRenderMessage(
						message,
						displayContent,
						proposalMessageId,
						isStreaming,
						isLastMessage,
					)
				) {
					return null;
				}

				return (
					<div
						key={message.id}
						className={`chat ${message.role === 'user' ? 'chat-end' : 'chat-start'}`}
					>
						<div className="chat-header text-xs text-base-content/70">
							{message.role === 'user' ? 'あなた' : 'AIアシスタント'}
						</div>
						<div
							className={`chat-bubble whitespace-pre-wrap ${
								message.role === 'user'
									? 'chat-bubble-primary'
									: 'chat-bubble-neutral'
							}`}
						>
							{displayContent || (
								<span className="loading loading-sm loading-dots" />
							)}
						</div>
					</div>
				);
			})}
			{isStreaming && messages[messages.length - 1]?.content && (
				<div className="chat-start chat">
					<div className="chat-bubble chat-bubble-neutral opacity-50">
						<span className="loading loading-sm loading-dots" />
					</div>
				</div>
			)}
			<div ref={endRef} />
		</div>
	);
};
