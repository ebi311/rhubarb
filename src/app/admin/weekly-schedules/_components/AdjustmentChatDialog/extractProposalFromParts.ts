import {
	AiChatMutationBatchProposalSchema,
	AiChatMutationProposalSchema,
	type AiChatMutationBatchProposal,
	type AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';
import type { UIMessage } from 'ai';
import { isAllowedProposal, type ProposalAllowlist } from './parseProposal';

const SINGLE_PROPOSAL_TOOL_NAME = 'proposeShiftChange';
const SINGLE_PROPOSAL_TOOL_PART_TYPE = 'tool-proposeShiftChange';
const BATCH_PROPOSAL_TOOL_NAME = 'proposeShiftChanges';
const BATCH_PROPOSAL_TOOL_PART_TYPE = 'tool-proposeShiftChanges';

type ProposalOutputPart = Extract<
	UIMessage['parts'][number],
	{ state: 'output-available'; output: unknown }
>;

const isOutputAvailablePart = (
	part: UIMessage['parts'][number],
): part is ProposalOutputPart => {
	return (
		'state' in part && part.state === 'output-available' && 'output' in part
	);
};

type ExtractedProposal =
	| { type: 'single'; proposal: AiChatMutationProposal }
	| { type: 'batch'; proposal: AiChatMutationBatchProposal };

const getToolIdentity = (part: ProposalOutputPart) => {
	if (part.type === SINGLE_PROPOSAL_TOOL_PART_TYPE) {
		return 'single';
	}

	if (part.type === BATCH_PROPOSAL_TOOL_PART_TYPE) {
		return 'batch';
	}

	if (part.type !== 'dynamic-tool') {
		return null;
	}

	if (part.toolName === SINGLE_PROPOSAL_TOOL_NAME) {
		return 'single';
	}

	if (part.toolName === BATCH_PROPOSAL_TOOL_NAME) {
		return 'batch';
	}

	return null;
};

const getPartLabel = (part: ProposalOutputPart): string => {
	const toolName =
		'toolName' in part && typeof part.toolName === 'string'
			? part.toolName
			: undefined;
	return toolName
		? `type=${part.type} toolName=${toolName}`
		: `type=${part.type}`;
};

const getProposalWarnDetails = (proposal: AiChatMutationProposal) => {
	if (proposal.type === 'change_shift_staff') {
		return {
			type: proposal.type,
			shiftId: proposal.shiftId,
			toStaffId: proposal.toStaffId,
		};
	}

	return {
		type: proposal.type,
		shiftId: proposal.shiftId,
		startAt: proposal.startAt,
		endAt: proposal.endAt,
	};
};

const isAllowedBatchProposal = (
	proposal: AiChatMutationBatchProposal,
	allowlist: ProposalAllowlist,
): boolean =>
	proposal.proposals.every((candidate) =>
		isAllowedProposal(candidate, allowlist),
	);

export const extractProposalFromParts = (
	parts: UIMessage['parts'],
	allowlist: ProposalAllowlist,
): ExtractedProposal | null => {
	for (let index = parts.length - 1; index >= 0; index -= 1) {
		const part = parts[index];
		if (!part || !isOutputAvailablePart(part)) {
			continue;
		}

		const toolIdentity = getToolIdentity(part);
		if (!toolIdentity) {
			continue;
		}

		if (toolIdentity === 'single') {
			const parsed = AiChatMutationProposalSchema.safeParse(part.output);
			if (!parsed.success) {
				console.warn(
					`[extractProposalFromParts] schema validation failed (${getPartLabel(part)}):`,
					parsed.error.flatten().fieldErrors,
				);
				continue;
			}

			if (!isAllowedProposal(parsed.data, allowlist)) {
				console.warn(
					`[extractProposalFromParts] allowlist rejected proposal (${getPartLabel(part)})`,
					getProposalWarnDetails(parsed.data),
				);
				continue;
			}

			return { type: 'single', proposal: parsed.data };
		}

		const parsed = AiChatMutationBatchProposalSchema.safeParse(part.output);
		if (!parsed.success) {
			console.warn(
				`[extractProposalFromParts] schema validation failed (${getPartLabel(part)}):`,
				parsed.error.flatten().fieldErrors,
			);
			continue;
		}

		if (!isAllowedBatchProposal(parsed.data, allowlist)) {
			console.warn(
				`[extractProposalFromParts] allowlist rejected proposal (${getPartLabel(part)})`,
				parsed.data.proposals.map(getProposalWarnDetails),
			);
			continue;
		}

		return { type: 'batch', proposal: parsed.data };
	}

	return null;
};

export type { ExtractedProposal };
