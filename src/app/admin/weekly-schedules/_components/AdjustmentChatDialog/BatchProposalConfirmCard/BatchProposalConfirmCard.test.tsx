import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BatchProposalConfirmCard } from './BatchProposalConfirmCard';

const proposal = {
	proposals: [
		{
			type: 'change_shift_staff' as const,
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '欠勤対応',
		},
		{
			type: 'update_shift_time' as const,
			shiftId: TEST_IDS.SCHEDULE_2,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '利用者都合',
		},
	],
};

const proposalWithMeta = {
	proposals: [
		{
			type: 'change_shift_staff' as const,
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '欠勤対応',
			_meta: {
				shiftDate: '2026-03-16',
				shiftStartTime: '09:00',
				shiftEndTime: '10:00',
				clientName: '田中花子',
				serviceTypeName: '生活支援',
				toStaffName: '鈴木太郎',
			},
		},
		{
			type: 'update_shift_time' as const,
			shiftId: TEST_IDS.SCHEDULE_2,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '利用者都合',
			_meta: {
				shiftDate: '2026-03-16',
				shiftStartTime: '09:00',
				shiftEndTime: '10:00',
				clientName: '田中花子',
				serviceTypeName: '生活支援',
			},
		},
	],
};

describe('BatchProposalConfirmCard', () => {
	it('初期表示では全提案が承認状態で表示される', () => {
		render(
			<BatchProposalConfirmCard
				proposal={proposal}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(2);
		expect(checkboxes[0]).toBeChecked();
		expect(checkboxes[1]).toBeChecked();
		expect(
			screen.getByText('2件の提案があります。適用する内容を選んでください。'),
		).toBeInTheDocument();
	});

	it('チェックを外した提案は onConfirm から除外される', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(
			<BatchProposalConfirmCard
				proposal={proposal}
				onConfirm={onConfirm}
				onCancel={vi.fn()}
			/>,
		);

		await user.click(screen.getByLabelText('2件目の提案を承認'));
		await user.click(screen.getByRole('button', { name: '確定' }));

		expect(onConfirm).toHaveBeenCalledWith([proposal.proposals[0]]);
	});

	it('すべて未承認にすると確定ボタンが無効になる', async () => {
		const user = userEvent.setup();

		render(
			<BatchProposalConfirmCard
				proposal={proposal}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		await user.click(screen.getByLabelText('1件目の提案を承認'));
		await user.click(screen.getByLabelText('2件目の提案を承認'));

		expect(screen.getByRole('button', { name: '確定' })).toBeDisabled();
	});

	it('キャンセルクリックで onCancel を呼ぶ', async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();

		render(
			<BatchProposalConfirmCard
				proposal={proposal}
				onConfirm={vi.fn()}
				onCancel={onCancel}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	describe('_meta なし（フォールバック表示）', () => {
		it('change_shift_staff は UUID ベースのフォールバック表示になる', () => {
			render(
				<BatchProposalConfirmCard
					proposal={proposal}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(
				screen.getByText(
					`shiftId: ${TEST_IDS.SCHEDULE_1} / toStaffId: ${TEST_IDS.STAFF_2}`,
				),
			).toBeInTheDocument();
		});

		it('update_shift_time は startAt / endAt のフォールバック表示になる', () => {
			render(
				<BatchProposalConfirmCard
					proposal={proposal}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(
				screen.getByText(
					'2026-03-16T09:00:00+09:00 → 2026-03-16T10:00:00+09:00',
				),
			).toBeInTheDocument();
		});
	});

	describe('_meta あり（人間可読表示）', () => {
		it('change_shift_staff は日付・利用者名・時間・担当者名を表示する', () => {
			render(
				<BatchProposalConfirmCard
					proposal={proposalWithMeta}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(
				screen.getByText('2026-03-16 田中花子様 09:00〜10:00 → 鈴木太郎'),
			).toBeInTheDocument();
		});

		it('update_shift_time は日付・時間帯を表示する', () => {
			render(
				<BatchProposalConfirmCard
					proposal={proposalWithMeta}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(screen.getByText('2026-03-16 09:00〜10:00')).toBeInTheDocument();
		});

		it('clientName が未設定の場合は「利用者不明」を表示する', () => {
			const proposalNoClient = {
				proposals: [
					{
						type: 'change_shift_staff' as const,
						shiftId: TEST_IDS.SCHEDULE_1,
						toStaffId: TEST_IDS.STAFF_2,
						reason: '欠勤対応',
						_meta: {
							shiftDate: '2026-03-16',
							shiftStartTime: '09:00',
							shiftEndTime: '10:00',
							toStaffName: '鈴木太郎',
						},
					},
				],
			};

			render(
				<BatchProposalConfirmCard
					proposal={proposalNoClient}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(
				screen.getByText('2026-03-16 利用者不明様 09:00〜10:00 → 鈴木太郎'),
			).toBeInTheDocument();
		});

		it('toStaffName が未設定の場合は toStaffId を表示する', () => {
			const proposalNoStaffName = {
				proposals: [
					{
						type: 'change_shift_staff' as const,
						shiftId: TEST_IDS.SCHEDULE_1,
						toStaffId: TEST_IDS.STAFF_2,
						reason: '欠勤対応',
						_meta: {
							shiftDate: '2026-03-16',
							shiftStartTime: '09:00',
							shiftEndTime: '10:00',
							clientName: '田中花子',
						},
					},
				],
			};

			render(
				<BatchProposalConfirmCard
					proposal={proposalNoStaffName}
					onConfirm={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			expect(
				screen.getByText(
					`2026-03-16 田中花子様 09:00〜10:00 → ${TEST_IDS.STAFF_2}`,
				),
			).toBeInTheDocument();
		});
	});
});
