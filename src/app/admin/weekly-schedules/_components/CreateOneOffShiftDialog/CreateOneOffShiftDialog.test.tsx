import { createOneOffShiftAction } from '@/app/actions/shifts';
import type { ActionResult } from '@/app/actions/utils/actionResult';
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

		const success: ActionResult<unknown> = {
			data: null,
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
		const result: ActionResult<unknown> = {
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
});
