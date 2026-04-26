'use client';

import { executeAiChatMutationAction } from '@/app/actions/aiChatMutation';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	AiChatMutationProposal,
	ExecuteAiChatMutationResult,
	ProposalAllowlist,
} from '@/models/aiChatMutationProposal';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

export const SUCCESS_MESSAGE = '提案を適用しました';
export const DEFAULT_ERROR_MESSAGE = '提案の適用に失敗しました';
export const CONFLICT_ERROR_MESSAGE =
	'シフトが競合しているため提案を適用できません。最新の状態を確認してください。';

type UseProposalExecutionOptions = {
	proposal: AiChatMutationProposal | null;
	allowlist: ProposalAllowlist;
	onSuccess?: (data: ExecuteAiChatMutationResult | null) => void;
	onDismiss?: () => void;
};

type UseProposalExecutionReturn = {
	isExecuting: boolean;
	execute: () => Promise<void>;
	dismiss: () => void;
};

export const useProposalExecution = ({
	proposal,
	allowlist,
	onSuccess,
	onDismiss,
}: UseProposalExecutionOptions): UseProposalExecutionReturn => {
	const [isExecuting, setIsExecuting] = useState(false);
	const isExecutingRef = useRef(false);
	const router = useRouter();
	const { handleActionResult } = useActionResultHandler();

	const execute = useCallback(async () => {
		if (!proposal || isExecutingRef.current) {
			return;
		}

		isExecutingRef.current = true;
		setIsExecuting(true);

		try {
			const result = await executeAiChatMutationAction({
				proposal,
				allowlist,
			});

			handleActionResult(result, {
				successMessage: SUCCESS_MESSAGE,
				errorMessage:
					result.status === 409
						? CONFLICT_ERROR_MESSAGE
						: DEFAULT_ERROR_MESSAGE,
				onSuccess: (data) => {
					router.refresh();
					onSuccess?.(data);
				},
			});
		} catch {
			handleActionResult(
				{
					data: null,
					error: DEFAULT_ERROR_MESSAGE,
					status: 500,
				},
				{
					errorMessage: DEFAULT_ERROR_MESSAGE,
				},
			);
		} finally {
			isExecutingRef.current = false;
			setIsExecuting(false);
		}
	}, [allowlist, handleActionResult, onSuccess, proposal, router]);

	const dismiss = useCallback(() => {
		onDismiss?.();
	}, [onDismiss]);

	return {
		isExecuting,
		execute,
		dismiss,
	};
};
