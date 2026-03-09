'use client';

import { useCallback, useRef, useState } from 'react';

type ChatInputProps = {
	onSend: (message: string) => void;
	disabled?: boolean;
};

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
	const [value, setValue] = useState('');
	const [isComposing, setIsComposing] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSubmit = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;

		onSend(trimmed);
		setValue('');
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// IME 入力中（漢字変換中など）は Enter で送信しない
			if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit, isComposing],
	);

	const isSubmitDisabled = disabled || !value.trim();

	return (
		<div className="flex gap-2">
			<textarea
				ref={textareaRef}
				className="textarea-bordered textarea flex-1 resize-none"
				placeholder="メッセージを入力..."
				rows={2}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				onCompositionStart={() => setIsComposing(true)}
				onCompositionEnd={() => setIsComposing(false)}
				disabled={disabled}
			/>
			<button
				type="button"
				className="btn self-end btn-primary"
				onClick={handleSubmit}
				disabled={isSubmitDisabled}
			>
				送信
			</button>
		</div>
	);
};
