import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProposalDismissState } from './useProposalDismissState';

describe('useProposalDismissState', () => {
	it('dismissProposal で isDismissed と shouldShowGuidance が true になる', () => {
		const { result } = renderHook(() => useProposalDismissState('proposal-1'));

		act(() => {
			result.current.dismissProposal();
		});

		expect(result.current.isDismissed).toBe(true);
		expect(result.current.shouldShowGuidance(true, false)).toBe(true);
	});

	it('confirmProposal では shouldShowGuidance は false のまま', () => {
		const { result } = renderHook(() => useProposalDismissState('proposal-1'));

		act(() => {
			result.current.confirmProposal();
		});

		expect(result.current.isDismissed).toBe(true);
		expect(result.current.shouldShowGuidance(true, false)).toBe(false);
	});

	it('proposalKey が変わると shouldShowGuidance がリセットされる', () => {
		const { result, rerender } = renderHook(
			({ proposalKey }) => useProposalDismissState(proposalKey),
			{ initialProps: { proposalKey: 'proposal-1' as string | null } },
		);

		act(() => {
			result.current.dismissProposal();
		});

		expect(result.current.shouldShowGuidance(true, false)).toBe(true);

		rerender({ proposalKey: 'proposal-2' });

		expect(result.current.shouldShowGuidance(true, false)).toBe(false);
	});

	it('isStreaming=true のとき shouldShowGuidance は false', () => {
		const { result } = renderHook(() => useProposalDismissState('proposal-1'));

		act(() => {
			result.current.dismissProposal();
		});

		expect(result.current.shouldShowGuidance(true, true)).toBe(false);
	});
});
