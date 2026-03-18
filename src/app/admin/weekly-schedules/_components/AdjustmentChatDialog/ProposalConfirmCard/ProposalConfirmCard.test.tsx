import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProposalConfirmCard } from './ProposalConfirmCard';

const createChangeStaffProposal = () => ({
	type: 'change_shift_staff' as const,
	shiftId: TEST_IDS.SCHEDULE_1,
	toStaffId: TEST_IDS.STAFF_2,
	reason: '担当者の急病のため',
});

const createUpdateTimeProposal = () => ({
	type: 'update_shift_time' as const,
	shiftId: TEST_IDS.SCHEDULE_1,
	startAt: '2026-02-24T11:00:00+09:00',
	endAt: '2026-02-24T12:00:00+09:00',
	reason: '利用者都合のため',
});

describe('ProposalConfirmCard', () => {
	it('streaming 中は Confirm ボタンが disabled になり、クリックしても onConfirm が呼ばれない', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(
			<ProposalConfirmCard
				proposal={createChangeStaffProposal()}
				beforeValue="山田 太郎"
				afterValue="佐藤 花子"
				isStreaming={true}
				onConfirm={onConfirm}
				onDismiss={vi.fn()}
			/>,
		);

		const confirmButton = screen.getByRole('button', { name: 'Confirm' });
		expect(confirmButton).toBeDisabled();

		await user.click(confirmButton);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('executing 中は Confirm ボタンが disabled になる', () => {
		render(
			<ProposalConfirmCard
				proposal={createUpdateTimeProposal()}
				beforeValue="10:00-11:00"
				afterValue="11:00-12:00"
				isExecuting={true}
				onConfirm={vi.fn()}
				onDismiss={vi.fn()}
			/>,
		);

		expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
	});

	it('Confirm / Dismiss クリックで callback が呼ばれる', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		const onDismiss = vi.fn();

		render(
			<ProposalConfirmCard
				proposal={createChangeStaffProposal()}
				beforeValue="山田 太郎"
				afterValue="佐藤 花子"
				onConfirm={onConfirm}
				onDismiss={onDismiss}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'Confirm' }));
		await user.click(screen.getByRole('button', { name: 'Dismiss' }));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('change_shift_staff の Before / After と reason を表示する', () => {
		render(
			<ProposalConfirmCard
				proposal={createChangeStaffProposal()}
				beforeValue="山田 太郎"
				afterValue="佐藤 花子"
				onConfirm={vi.fn()}
				onDismiss={vi.fn()}
			/>,
		);

		expect(screen.getByText('担当者変更')).toBeInTheDocument();
		expect(screen.getByText('Before')).toBeInTheDocument();
		expect(screen.getByText('After')).toBeInTheDocument();
		expect(screen.getByText('山田 太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
		expect(screen.getByText('担当者の急病のため')).toBeInTheDocument();
	});
});
