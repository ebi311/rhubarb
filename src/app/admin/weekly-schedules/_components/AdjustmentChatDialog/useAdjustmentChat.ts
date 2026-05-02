import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useCallback, useMemo } from 'react';

export type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
};

export type ShiftContext = {
	id: string;
	staffName?: string;
	clientName?: string;
	clientId: string;
	serviceTypeId: ServiceTypeId;
	date: string;
	startTime: string;
	endTime: string;
};

export type SingleChatContext = {
	mode: 'single';
	shifts: ShiftContext[];
	staffIds?: string[];
};

export type FlexibleChatContext = {
	mode: 'flexible';
	weekRange: {
		startDate: string;
		endDate: string;
	};
};

export type ChatContextOptions = SingleChatContext | FlexibleChatContext;

type UseAdjustmentChatOptions = {
	context: ChatContextOptions;
};

type UseAdjustmentChatReturn = {
	messages: ChatMessage[];
	rawMessages: UIMessage[];
	isStreaming: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
	stop: () => void;
};

// UIMessage からテキストコンテンツを抽出
const getTextContent = (msg: UIMessage): string => {
	// parts 配列からテキストパートを抽出
	const textParts = msg.parts
		?.filter((part) => part.type === 'text')
		.map((part) => ('text' in part ? part.text : ''))
		.join('');
	return textParts ?? '';
};

// UIMessage を ChatMessage 形式に変換
const convertToChatMessage = (msg: UIMessage): ChatMessage => ({
	id: msg.id,
	role: msg.role as 'user' | 'assistant',
	content: getTextContent(msg),
	timestamp: new Date(),
});

export const useAdjustmentChat = ({
	context,
}: UseAdjustmentChatOptions): UseAdjustmentChatReturn => {
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: '/api/chat/shift-adjustment',
				headers: {
					'x-ai-response-format': 'uimessage',
				},
				body: {
					context,
				},
			}),
		[context],
	);

	const {
		messages: sdkMessages,
		status,
		error: sdkError,
		sendMessage: sdkSendMessage,
		setMessages,
		stop,
	} = useChat({
		transport,
	});

	const isStreaming = status === 'streaming' || status === 'submitted';

	// SDK メッセージを ChatMessage 形式に変換
	const messages = useMemo(
		() =>
			sdkMessages
				.filter((msg) => msg.role === 'user' || msg.role === 'assistant')
				.map(convertToChatMessage),
		[sdkMessages],
	);

	const sendMessage = useCallback(
		async (content: string) => {
			const trimmedContent = content.trim();
			if (!trimmedContent || isStreaming) return;

			// sendMessage は text フィールドで文字列を受け取る
			await sdkSendMessage({ text: trimmedContent });
		},
		[isStreaming, sdkSendMessage],
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, [setMessages]);

	return {
		messages,
		rawMessages: sdkMessages,
		isStreaming,
		error: sdkError?.message ?? null,
		sendMessage,
		clearMessages,
		stop,
	};
};
