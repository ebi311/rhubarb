import { TEST_IDS } from '@/test/helpers/testIds';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdjustmentWizardDialog } from './AdjustmentWizardDialog';

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
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('処理を選択')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'ヘルパーの変更' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: '日時の変更' }),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '日時の変更' })).toBeDisabled();
		expect(screen.queryByText(TEST_IDS.SCHEDULE_1)).not.toBeInTheDocument();

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-labelledby');
		expect(dialog).toHaveAttribute('aria-describedby');
	});

	it('ヘルパーの変更を選ぶとStepが進み、戻るでStep1に戻れる', async () => {
		const user = userEvent.setup();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));

		expect(screen.getByText('ヘルパー変更（準備中）')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '戻る' }));

		expect(screen.getByText('処理を選択')).toBeInTheDocument();
	});

	it('日時の変更は選択できない（準備中）', async () => {
		const user = userEvent.setup();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				onClose={vi.fn()}
			/>,
		);

		const datetimeButton = screen.getByRole('button', { name: '日時の変更' });
		expect(datetimeButton).toBeDisabled();

		await user.click(datetimeButton);

		expect(screen.getByText('処理を選択')).toBeInTheDocument();
		expect(screen.queryByText('日時変更（準備中）')).not.toBeInTheDocument();
		expect(screen.queryByText('日時候補（準備中）')).not.toBeInTheDocument();
	});

	it('Escキャンセル時にonCloseが呼ばれる', () => {
		const onClose = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
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

	it('閉じて再度開くとselectステップから開始する', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		const { rerender } = render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		expect(screen.getByText('ヘルパー変更（準備中）')).toBeInTheDocument();

		rerender(
			<AdjustmentWizardDialog
				isOpen={false}
				shiftId={TEST_IDS.SCHEDULE_1}
				onClose={onClose}
			/>,
		);

		rerender(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				onClose={onClose}
			/>,
		);

		expect(screen.getByText('処理を選択')).toBeInTheDocument();
	});
});
