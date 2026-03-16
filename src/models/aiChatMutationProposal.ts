import { z } from 'zod';

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

export type AiChatMutationProposal = z.infer<
	typeof AiChatMutationProposalSchema
>;
