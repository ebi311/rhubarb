import { createOneOffShiftAction } from '@/app/actions/shifts';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { ShiftRecord } from '@/models/shiftActionSchemas';
import { TEST_IDS } from '@/test/helpers/testIds';
import { formatJstDateString } from '@/utils/date';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateOneOffShiftDialog } from './CreateOneOffShiftDialog';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: mockRefresh,
	}),
}));

vi.mock('react-toastify', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('@/app/actions/shifts', () => ({
	createOneOffShiftAction: vi.fn(),
}));

describe('CreateOneOffShiftDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('必須項目未入力で送信できない', () => {
		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={new Date('2026-02-16T00:00:00')}
				clientOptions={[]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
	});

	it('必須項目を埋めて送信するとcreateOneOffShiftActionが期待引数で呼ばれ、成功時にcloseとrefreshが呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const weekStartDate = new Date('2026-02-16T00:00:00');
		const weekStartDateStr = formatJstDateString(weekStartDate);

		const createdShift: ShiftRecord = {
			id: TEST_IDS.SCHEDULE_1,
			client_id: TEST_IDS.CLIENT_1,
			service_type_id: 'life-support',
			staff_id: null,
			date: new Date(weekStartDateStr),
			start_time: { hour: 9, minute: 0 },
			end_time: { hour: 10, minute: 0 },
			status: 'scheduled',
			is_unassigned: true,
			canceled_reason: null,
			canceled_category: null,
			canceled_at: null,
			created_at: new Date('2026-02-01T00:00:00Z'),
			updated_at: new Date('2026-02-01T00:00:00Z'),
		};

		const success: ActionResult<ShiftRecord> = {
			data: createdShift,
			error: null,
			status: 201,
		};
		vi.mocked(createOneOffShiftAction).mockResolvedValue(success);

		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={weekStartDate}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={onClose}
			/>,
		);

		const serviceTypeSelect = screen.getAllByRole('combobox')[1];
		await user.selectOptions(serviceTypeSelect, 'life-support');

		await user.click(screen.getByRole('button', { name: '保存' }));

		await waitFor(() => {
			expect(createOneOffShiftAction).toHaveBeenCalledWith({
				weekStartDate: weekStartDateStr,
				client_id: TEST_IDS.CLIENT_1,
				service_type_id: 'life-support',
				staff_id: null,
				date: weekStartDateStr,
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
			});
		});

		await waitFor(() => {
			expect(mockRefresh).toHaveBeenCalled();
			expect(onClose).toHaveBeenCalled();
		});
	});

	it('Actionがerrorを返した場合、closeしない', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const result: ActionResult<ShiftRecord> = {
			data: null,
			error: 'conflict',
			status: 409,
		};
		vi.mocked(createOneOffShiftAction).mockResolvedValue(result);

		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={new Date('2026-02-16T00:00:00')}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '保存' }));

		await waitFor(() => {
			expect(createOneOffShiftAction).toHaveBeenCalled();
		});

		expect(onClose).not.toHaveBeenCalled();
		expect(mockRefresh).not.toHaveBeenCalled();
	});

	it('defaultDateStr を指定して open すると日付入力がその値で初期化される', () => {
		const weekStartDate = new Date('2026-02-16T00:00:00Z');
		const defaultDateStr = '2026-02-18';

		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={weekStartDate}
				defaultDateStr={defaultDateStr}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		const dateInput = screen.getByLabelText(
			'日付（週内のみ）',
		) as HTMLInputElement;
		expect(dateInput.value).toBe(defaultDateStr);
	});

	it('defaultDateStr を変更して rerender すると日付入力が更新される', async () => {
		const weekStartDate = new Date('2026-02-16T00:00:00Z');
		const { rerender } = render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={weekStartDate}
				defaultDateStr="2026-02-18"
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		rerender(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={weekStartDate}
				defaultDateStr="2026-02-19"
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		await waitFor(() => {
			const dateInput = screen.getByLabelText(
				'日付（週内のみ）',
			) as HTMLInputElement;
			expect(dateInput.value).toBe('2026-02-19');
		});
	});

	it('日時入力はラベルクリックでフォーカスされる', async () => {
		const user = userEvent.setup();
		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={new Date('2026-02-16T00:00:00Z')}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		const startInput = screen.getByLabelText('開始');
		expect(startInput).not.toHaveFocus();
		await user.click(screen.getByText('開始'));
		expect(startInput).toHaveFocus();

		const endInput = screen.getByLabelText('終了');
		expect(endInput).not.toHaveFocus();
		await user.click(screen.getByText('終了'));
		expect(endInput).toHaveFocus();
	});

	it('defaultClientId を指定して open すると利用者selectがその値で初期化される（optionsに存在する場合）', () => {
		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={new Date('2026-02-16T00:00:00Z')}
				defaultClientId={TEST_IDS.CLIENT_2}
				clientOptions={[
					{ id: TEST_IDS.CLIENT_1, name: '利用者A' },
					{ id: TEST_IDS.CLIENT_2, name: '利用者B' },
				]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		const clientSelect = screen.getAllByRole('combobox')[0];
		expect(clientSelect).toHaveValue(TEST_IDS.CLIENT_2);
	});

	it('defaultClientId が options に存在しない場合は先頭の利用者が選択される', () => {
		render(
			<CreateOneOffShiftDialog
				isOpen
				weekStartDate={new Date('2026-02-16T00:00:00Z')}
				defaultClientId={TEST_IDS.CLIENT_3}
				clientOptions={[
					{ id: TEST_IDS.CLIENT_1, name: '利用者A' },
					{ id: TEST_IDS.CLIENT_2, name: '利用者B' },
				]}
				staffOptions={[]}
				onClose={vi.fn()}
			/>,
		);

		const clientSelect = screen.getAllByRole('combobox')[0];
		expect(clientSelect).toHaveValue(TEST_IDS.CLIENT_1);
	});
});
