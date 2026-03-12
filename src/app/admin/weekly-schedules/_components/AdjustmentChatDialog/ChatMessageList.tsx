'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './useAdjustmentChat';

type ChatMessageListProps = {
	messages: ChatMessage[];
	isStreaming?: boolean;
};

export const ChatMessageList = ({
	messages,
	isStreaming = false,
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
			{messages.map((message) => (
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
						{message.content || (
							<span className="loading loading-sm loading-dots" />
						)}
					</div>
				</div>
			))}
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
