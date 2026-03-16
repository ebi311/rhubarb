import {
	AiChatMutationProposalSchema,
	type AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';

type ProposalAllowlist = {
	shiftIds: string[];
	staffIds?: string[];
};

const extractJsonCodeBlock = (content: string): string | null => {
	const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi;
	const matches = [...content.matchAll(jsonCodeBlockRegex)];

	if (matches.length !== 1) {
		return null;
	}

	return matches[0]?.[1] ?? null;
};

const isAllowedProposal = (
	proposal: AiChatMutationProposal,
	allowlist: ProposalAllowlist,
): boolean => {
	if (!allowlist.shiftIds.includes(proposal.shiftId)) {
		return false;
	}

	if (proposal.type === 'change_shift_staff') {
		if (!allowlist.staffIds?.length) {
			return false;
		}

		if (!allowlist.staffIds.includes(proposal.toStaffId)) {
			return false;
		}
	}

	return true;
};

export const parseProposal = (
	content: string,
	allowlist: ProposalAllowlist,
): AiChatMutationProposal | null => {
	const jsonText = extractJsonCodeBlock(content);

	if (!jsonText) {
		return null;
	}

	const parsedJson = (() => {
		try {
			return JSON.parse(jsonText) as unknown;
		} catch {
			return null;
		}
	})();

	if (!parsedJson) {
		return null;
	}

	const result = AiChatMutationProposalSchema.safeParse(parsedJson);

	if (!result.success) {
		return null;
	}

	if (!isAllowedProposal(result.data, allowlist)) {
		return null;
	}

	return result.data;
};
