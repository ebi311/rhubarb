'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './useAdjustmentChat';

type ChatMessageListProps = {
	messages: ChatMessage[];
	isStreaming?: boolean;
	hasProposal?: boolean;
};

const PROPOSAL_PLACEHOLDER_TEXT = '（提案を生成しました）';
const JSON_CODE_BLOCK_REGEX = /```json\s*[\s\S]*?\s*```/gi;
const JSON_CODE_BLOCK_DETECT_REGEX = /```json\s*[\s\S]*?\s*```/i;

const getAssistantContentWithoutJsonBlock = (content: string): string =>
	content.replace(JSON_CODE_BLOCK_REGEX, '').trim();

const shouldHideProposalPlaceholderMessage = (
	content: string,
	hasProposal: boolean,
): boolean => {
	if (!hasProposal) {
		return false;
	}

	const hasJsonCodeBlock = JSON_CODE_BLOCK_DETECT_REGEX.test(content);
	if (!hasJsonCodeBlock) {
		return false;
	}

	return getAssistantContentWithoutJsonBlock(content).length === 0;
};

const getAssistantDisplayContent = (
	content: string,
	hasProposal: boolean,
): string | null => {
	if (content.trim().length === 0) {
		return null;
	}

	if (shouldHideProposalPlaceholderMessage(content, hasProposal)) {
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

const getMessageDisplayContent = (
	message: ChatMessage,
	hasProposal: boolean,
): string | null => {
	if (message.role === 'assistant') {
		return getAssistantDisplayContent(message.content, hasProposal);
	}

	return message.content;
};

export const ChatMessageList = ({
	messages,
	isStreaming = false,
	hasProposal = false,
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
			{messages.map((message) => {
				if (
					message.role === 'assistant' &&
					shouldHideProposalPlaceholderMessage(message.content, hasProposal)
				) {
					return null;
				}

				const displayContent = getMessageDisplayContent(message, hasProposal);

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
