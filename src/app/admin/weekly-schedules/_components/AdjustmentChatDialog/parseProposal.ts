import {
	AiChatMutationProposalSchema,
	type AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';

export type ProposalAllowlist = {
	shiftIds: string[];
	staffIds?: string[];
};

export type ParseProposalFailReason =
	| 'no_json_block'
	| 'multiple_json_blocks'
	| 'json_parse_error'
	| 'schema_invalid'
	| 'allowlist_rejected';

const extractJsonCodeBlock = (
	content: string,
):
	| { jsonText: string; failReason: null }
	| { jsonText: null; failReason: ParseProposalFailReason } => {
	const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi;
	const matches = [...content.matchAll(jsonCodeBlockRegex)];

	if (matches.length === 0) {
		return { jsonText: null, failReason: 'no_json_block' };
	}

	if (matches.length > 1) {
		return { jsonText: null, failReason: 'multiple_json_blocks' };
	}

	const jsonText = matches[0]?.[1] ?? null;
	if (!jsonText) {
		return { jsonText: null, failReason: 'no_json_block' };
	}

	return { jsonText, failReason: null };
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

export const parseProposalWithDiagnostic = (
	content: string,
	allowlist: ProposalAllowlist,
): {
	proposal: AiChatMutationProposal | null;
	failReason: ParseProposalFailReason | null;
} => {
	const extracted = extractJsonCodeBlock(content);
	if (extracted.failReason) {
		return { proposal: null, failReason: extracted.failReason };
	}

	const parsedJson = (() => {
		try {
			return JSON.parse(extracted.jsonText) as unknown;
		} catch {
			return null;
		}
	})();

	if (!parsedJson) {
		return { proposal: null, failReason: 'json_parse_error' };
	}

	const result = AiChatMutationProposalSchema.safeParse(parsedJson);
	if (!result.success) {
		return { proposal: null, failReason: 'schema_invalid' };
	}

	if (!isAllowedProposal(result.data, allowlist)) {
		return { proposal: null, failReason: 'allowlist_rejected' };
	}

	return { proposal: result.data, failReason: null };
};

export const parseProposal = (
	content: string,
	allowlist: ProposalAllowlist,
): AiChatMutationProposal | null => {
	const { proposal, failReason } = parseProposalWithDiagnostic(
		content,
		allowlist,
	);

	if (proposal) {
		return proposal;
	}

	console.warn('[parseProposal] failed to parse proposal', { failReason });

	return null;
};
