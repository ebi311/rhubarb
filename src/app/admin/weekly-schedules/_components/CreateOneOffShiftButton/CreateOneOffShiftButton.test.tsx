import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateOneOffShiftButton } from './CreateOneOffShiftButton';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: mockRefresh,
	}),
}));

describe('CreateOneOffShiftButton', () => {
	it('ボタンが表示される', () => {
		render(
			<CreateOneOffShiftButton
				weekStartDate={new Date('2026-02-16T00:00:00')}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
			/>,
		);

		expect(
			screen.getByRole('button', { name: '単発シフト追加' }),
		).toBeInTheDocument();
	});

	it('クリックでダイアログが開く', async () => {
		const user = userEvent.setup();
		render(
			<CreateOneOffShiftButton
				weekStartDate={new Date('2026-02-16T00:00:00')}
				clientOptions={[{ id: TEST_IDS.CLIENT_1, name: '利用者A' }]}
				staffOptions={[]}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '単発シフト追加' }));

		expect(
			screen.getByRole('heading', { name: '単発シフトを追加' }),
		).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});
});
