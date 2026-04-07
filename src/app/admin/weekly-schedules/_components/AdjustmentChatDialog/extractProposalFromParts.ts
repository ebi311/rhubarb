import {
	AiChatMutationProposalSchema,
	type AiChatMutationProposal,
} from '@/models/aiChatMutationProposal';
import type { UIMessage } from 'ai';
import { isAllowedProposal, type ProposalAllowlist } from './parseProposal';

const PROPOSAL_TOOL_NAME = 'proposeShiftChange';
const PROPOSAL_TOOL_PART_TYPE = 'tool-proposeShiftChange';

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

const isProposalToolPart = (part: ProposalOutputPart): boolean => {
	if (part.type === PROPOSAL_TOOL_PART_TYPE) {
		return true;
	}

	if (part.type !== 'dynamic-tool') {
		return false;
	}

	return part.toolName === PROPOSAL_TOOL_NAME;
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

export const extractProposalFromParts = (
	parts: UIMessage['parts'],
	allowlist: ProposalAllowlist,
): AiChatMutationProposal | null => {
	for (let index = parts.length - 1; index >= 0; index -= 1) {
		const part = parts[index];
		if (!part || !isOutputAvailablePart(part) || !isProposalToolPart(part)) {
			continue;
		}

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

		return parsed.data;
	}

	return null;
};
