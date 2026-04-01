import {
	AiChatMutationProposalSchema,
	type AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';
import type { UIMessage } from 'ai';
import { isAllowedProposal, type ProposalAllowlist } from './parseProposal';

const PROPOSAL_TOOL_NAME = 'proposeShiftChange';

export const extractProposalFromParts = (
	parts: UIMessage['parts'],
	allowlist: ProposalAllowlist,
): AiChatMutationProposal | null => {
	for (const part of parts) {
		if (part.type !== 'dynamic-tool') {
			continue;
		}

		if (
			part.toolName !== PROPOSAL_TOOL_NAME ||
			part.state !== 'output-available'
		) {
			continue;
		}

		const parsed = AiChatMutationProposalSchema.safeParse(part.output);
		if (!parsed.success) {
			console.warn('[extractProposalFromParts] schema validation failed');
			return null;
		}

		if (!isAllowedProposal(parsed.data, allowlist)) {
			console.warn('[extractProposalFromParts] allowlist rejected proposal');
			return null;
		}

		return parsed.data;
	}

	return null;
};
