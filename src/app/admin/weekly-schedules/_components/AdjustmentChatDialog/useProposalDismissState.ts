import { useCallback, useState } from 'react';

type DismissState = {
	dismissedKey: string | null;
	guidanceKey: string | null;
};

export const useProposalDismissState = (proposalKey: string | null) => {
	const [state, setState] = useState<DismissState>({
		dismissedKey: null,
		guidanceKey: null,
	});

	const isDismissed =
		proposalKey !== null && proposalKey === state.dismissedKey;

	const dismissProposal = useCallback(() => {
		setState({ dismissedKey: proposalKey, guidanceKey: proposalKey });
	}, [proposalKey]);

	const confirmProposal = useCallback(() => {
		setState((previous) => ({ ...previous, dismissedKey: proposalKey }));
	}, [proposalKey]);

	const shouldShowGuidance = (hasProposal: boolean, isStreaming: boolean) =>
		hasProposal &&
		!isStreaming &&
		proposalKey !== null &&
		state.guidanceKey === proposalKey;

	return {
		isDismissed,
		dismissProposal,
		confirmProposal,
		shouldShowGuidance,
	};
};
