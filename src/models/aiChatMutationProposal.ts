import { z } from 'zod';

const ChangeShiftStaffProposalSchema = z.object({
	type: z.literal('change_shift_staff'),
	shiftId: z.uuid(),
	toStaffId: z.uuid(),
	reason: z.string().min(1).optional(),
});

const UpdateShiftTimeProposalSchema = z
	.object({
		type: z.literal('update_shift_time'),
		shiftId: z.uuid(),
		startAt: z.string().datetime({ offset: true }),
		endAt: z.string().datetime({ offset: true }),
		reason: z.string().min(1).optional(),
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
