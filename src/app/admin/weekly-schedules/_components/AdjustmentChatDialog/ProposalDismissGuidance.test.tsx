import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
	PROPOSAL_DISMISS_GUIDANCE_MESSAGE,
	ProposalDismissGuidance,
} from './ProposalDismissGuidance';

describe('ProposalDismissGuidance', () => {
	it('visible=true かつ isStreaming=false のときガイダンスを表示する', () => {
		render(<ProposalDismissGuidance visible={true} isStreaming={false} />);

		const guidance = screen.getByRole('status');
		expect(guidance).toHaveTextContent(PROPOSAL_DISMISS_GUIDANCE_MESSAGE);
		expect(guidance).toHaveClass('alert', 'alert-info');
	});

	it('visible=false のときは何も表示しない', () => {
		render(<ProposalDismissGuidance visible={false} isStreaming={false} />);

		expect(
			screen.queryByText(PROPOSAL_DISMISS_GUIDANCE_MESSAGE),
		).not.toBeInTheDocument();
	});

	it('isStreaming=true のときは何も表示しない', () => {
		render(<ProposalDismissGuidance visible={true} isStreaming={true} />);

		expect(
			screen.queryByText(PROPOSAL_DISMISS_GUIDANCE_MESSAGE),
		).not.toBeInTheDocument();
	});
});
