import { TEST_IDS } from '@/test/helpers/testIds';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdjustmentWizardDialog } from './AdjustmentWizardDialog';

vi.mock('./StepHelperCandidates', () => ({
	StepHelperCandidates: ({ onComplete }: { onComplete: () => void }) => (
		<div>
			<p>ヘルパー候補ステップ</p>
			<button type="button" onClick={onComplete}>
				完了
			</button>
		</div>
	),
}));

vi.mock('./StepDatetimeInput', () => ({
	StepDatetimeInput: ({
		onShowCandidates,
	}: {
		onShowCandidates: (payload: {
			newStartTime: Date;
			newEndTime: Date;
		}) => void;
	}) => (
		<div>
			<p>日時入力ステップ</p>
			<button
				type="button"
				onClick={() =>
					onShowCandidates({
						newStartTime: new Date('2026-02-22T09:00:00+09:00'),
						newEndTime: new Date('2026-02-22T10:00:00+09:00'),
					})
				}
			>
				候補を表示
			</button>
		</div>
	),
}));

vi.mock('./StepDatetimeCandidates', () => ({
	StepDatetimeCandidates: () => <p>日時候補ステップ</p>,
}));

const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function showModal() {
		this.setAttribute('open', '');
	};

	HTMLDialogElement.prototype.close = function close() {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
});

afterAll(() => {
	HTMLDialogElement.prototype.showModal = originalShowModal;
	HTMLDialogElement.prototype.close = originalClose;
});

describe('AdjustmentWizardDialog', () => {
	it('isOpen=false のときは open されない', () => {
		const { container } = render(
			<AdjustmentWizardDialog
				isOpen={false}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		expect(container.querySelector('dialog')).toBeInTheDocument();
		expect(container.querySelector('dialog')).not.toHaveAttribute('open');
	});

	it('開くとStep1（処理選択）が表示される', () => {
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('処理を選択')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'ヘルパーの変更' }),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '日時の変更' })).toBeEnabled();
	});

	it('ヘルパーの変更を選ぶとStepが進み、戻るでStep1に戻れる', async () => {
		const user = userEvent.setup();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		expect(screen.getByText('ヘルパー候補ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '戻る' }));
		expect(screen.getByText('処理を選択')).toBeInTheDocument();
	});

	it('日時変更ルート: input -> candidates へ遷移し、戻るでinputへ戻る', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '候補を表示' }));
		expect(screen.getByText('日時候補ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '戻る' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();
	});

	it('ヘルパー候補完了時に onAssigned が呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onAssigned = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
				onAssigned={onAssigned}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		await user.click(screen.getByRole('button', { name: '完了' }));

		expect(onAssigned).toHaveBeenCalledTimes(1);
	});

	it('ヘルパー候補完了時に onClose が呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		await user.click(screen.getByRole('button', { name: '完了' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('close -> reopen で step が select にリセットされる', async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();

		rerender(
			<AdjustmentWizardDialog
				isOpen={false}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		rerender(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText('処理を選択')).toBeInTheDocument();
		expect(screen.queryByText('日時入力ステップ')).not.toBeInTheDocument();
	});

	it('Escキャンセル時にonCloseが呼ばれる', () => {
		const onClose = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
			/>,
		);

		const dialog = screen.getByRole('dialog');
		fireEvent(
			dialog,
			new Event('cancel', {
				bubbles: false,
				cancelable: true,
			}),
		);

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
