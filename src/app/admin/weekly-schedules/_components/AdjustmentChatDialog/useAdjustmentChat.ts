import { useCallback, useState } from 'react';

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
	date: string;
	startTime: string;
	endTime: string;
};

type UseAdjustmentChatOptions = {
	shiftContext: ShiftContext;
};

type UseAdjustmentChatReturn = {
	messages: ChatMessage[];
	isStreaming: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
};

const generateId = (): string => {
	return crypto.randomUUID();
};

type StreamChunkHandler = (content: string) => void;

const parseSSELine = (line: string): string | null => {
	if (!line.startsWith('data: ')) return null;

	const data = line.slice(6);
	if (data === '[DONE]') return null;

	try {
		const parsed = JSON.parse(data) as { content: string };
		return parsed.content;
	} catch {
		return null;
	}
};

const processStream = async (
	reader: ReadableStreamDefaultReader<Uint8Array>,
	onChunk: StreamChunkHandler,
): Promise<void> => {
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');

		// 最後の要素はまだ完結していない可能性があるのでバッファに残す
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			const content = parseSSELine(line);
			if (content !== null) {
				onChunk(content);
			}
		}
	}

	// 残ったバッファを処理
	if (buffer) {
		const content = parseSSELine(buffer);
		if (content !== null) {
			onChunk(content);
		}
	}
};

const sendChatRequest = async (
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	shiftContext: ShiftContext,
): Promise<Response> => {
	return fetch('/api/chat/shift-adjustment', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			messages,
			context: {
				shifts: [shiftContext],
			},
		}),
	});
};

export const useAdjustmentChat = ({
	shiftContext,
}: UseAdjustmentChatOptions): UseAdjustmentChatReturn => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(
		async (content: string) => {
			const trimmedContent = content.trim();
			if (!trimmedContent || isStreaming) return;

			const userMessage: ChatMessage = {
				id: generateId(),
				role: 'user',
				content: trimmedContent,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setIsStreaming(true);
			setError(null);

			const assistantMessageId = generateId();
			setMessages((prev) => [
				...prev,
				{
					id: assistantMessageId,
					role: 'assistant',
					content: '',
					timestamp: new Date(),
				},
			]);

			try {
				const apiMessages = [
					...messages.map((msg) => ({
						role: msg.role,
						content: msg.content,
					})),
					{ role: 'user' as const, content: trimmedContent },
				];

				const response = await sendChatRequest(apiMessages, shiftContext);

				if (!response.ok) {
					throw new Error('API request failed');
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('No response body');
				}

				let accumulatedContent = '';
				await processStream(reader, (chunk) => {
					accumulatedContent += chunk;
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === assistantMessageId
								? { ...msg, content: accumulatedContent }
								: msg,
						),
					);
				});
			} catch {
				setError('エラーが発生しました。再度お試しください。');
				setMessages((prev) =>
					prev.filter((msg) => msg.id !== assistantMessageId),
				);
			} finally {
				setIsStreaming(false);
			}
		},
		[messages, shiftContext, isStreaming],
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setError(null);
	}, []);

	return {
		messages,
		isStreaming,
		error,
		sendMessage,
		clearMessages,
	};
};
