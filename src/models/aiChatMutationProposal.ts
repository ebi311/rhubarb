import { z } from 'zod';

export const AI_CHAT_MUTATION_PROPOSAL_TYPES = [
	'change_shift_staff',
	'update_shift_time',
] as const;

export const AiChatMutationProposalTypeSchema = z.enum(
	AI_CHAT_MUTATION_PROPOSAL_TYPES,
);

export const ALLOWLIST_MAX_SHIFT_IDS = 200;
export const ALLOWLIST_MAX_STAFF_IDS = 500;

const ChangeShiftStaffProposalSchema = z.object({
	type: z.literal('change_shift_staff'),
	shiftId: z.uuid(),
	toStaffId: z.uuid(),
	reason: z.string().trim().min(1).optional(),
});

const UpdateShiftTimeProposalSchema = z
	.object({
		type: z.literal('update_shift_time'),
		shiftId: z.uuid(),
		// NOTE: タイムゾーンオフセット必須。SYSTEM_PROMPT 側の
		// 「+09:00 または末尾 Z 必須」の規約と常に整合させること。
		startAt: z.string().datetime({ offset: true }),
		endAt: z.string().datetime({ offset: true }),
		reason: z.string().trim().min(1).optional(),
	})
	.superRefine((proposal, ctx) => {
		if (new Date(proposal.startAt) >= new Date(proposal.endAt)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'startAt must be before endAt',
				path: ['startAt'],
			});
		}
	});

export const AiChatMutationProposalSchema = z.discriminatedUnion('type', [
	ChangeShiftStaffProposalSchema,
	UpdateShiftTimeProposalSchema,
]);

export const ProposalAllowlistSchema = z.object({
	shiftIds: z.array(z.uuid()).min(1).max(ALLOWLIST_MAX_SHIFT_IDS),
	staffIds: z.array(z.uuid()).max(ALLOWLIST_MAX_STAFF_IDS).optional(),
});

export const ExecuteAiChatMutationInputSchema = z
	.object({
		proposal: AiChatMutationProposalSchema,
		allowlist: ProposalAllowlistSchema,
	})
	.superRefine((input, ctx) => {
		if (input.proposal.type === 'change_shift_staff') {
			if (input.allowlist.staffIds === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'allowlist.staffIds is required',
					path: ['allowlist', 'staffIds'],
				});
				return;
			}

			if (input.allowlist.staffIds.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'allowlist.staffIds must not be empty',
					path: ['allowlist', 'staffIds'],
				});
			}
		}
	});

export const ExecuteAiChatMutationResultSchema = z.object({
	type: AiChatMutationProposalTypeSchema,
	shiftId: z.uuid(),
	officeId: z.uuid(),
});

export type AiChatMutationProposal = z.infer<
	typeof AiChatMutationProposalSchema
>;

export type ProposalAllowlist = z.infer<typeof ProposalAllowlistSchema>;

export type ExecuteAiChatMutationInput = z.infer<
	typeof ExecuteAiChatMutationInputSchema
>;

export type ExecuteAiChatMutationResult = z.infer<
	typeof ExecuteAiChatMutationResultSchema
>;
