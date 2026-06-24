export const PROPOSAL_DISMISS_GUIDANCE_MESSAGE =
	'提案をキャンセルしました。別の条件で再提案したい場合は、変更したい内容（例: 担当者・時間・理由）をチャットで送ってください。';

type ProposalDismissGuidanceProps = {
	visible: boolean;
	isStreaming: boolean;
};

export const ProposalDismissGuidance = ({
	visible,
	isStreaming,
}: ProposalDismissGuidanceProps) => {
	if (!visible || isStreaming) {
		return null;
	}

	return (
		<div className="mx-4 mt-4 alert text-sm alert-info" role="status">
			{PROPOSAL_DISMISS_GUIDANCE_MESSAGE}
		</div>
	);
};
