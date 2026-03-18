import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type { AiChatMutationProposal } from '@/models/aiChatMutationProposal';
import { toJstTimeStr } from '@/utils/date';
import type { ShiftContext } from './useAdjustmentChat';

type BuildProposalDisplayValuesInput = {
	proposal: AiChatMutationProposal;
	shiftContext: Pick<ShiftContext, 'staffName' | 'startTime' | 'endTime'>;
	staffOptions: StaffPickerOption[];
};

export const buildProposalDisplayValues = ({
	proposal,
	shiftContext,
	staffOptions,
}: BuildProposalDisplayValuesInput): {
	beforeValue: string;
	afterValue: string;
} => {
	if (proposal.type === 'change_shift_staff') {
		const nextStaffName =
			staffOptions.find((staffOption) => staffOption.id === proposal.toStaffId)
				?.name ?? proposal.toStaffId;

		return {
			beforeValue: shiftContext.staffName ?? '未割当',
			afterValue: nextStaffName,
		};
	}

	const startDate = new Date(proposal.startAt);
	const endDate = new Date(proposal.endAt);

	return {
		beforeValue: `${shiftContext.startTime}〜${shiftContext.endTime}`,
		afterValue: `${toJstTimeStr(startDate)}〜${toJstTimeStr(endDate)}`,
	};
};
