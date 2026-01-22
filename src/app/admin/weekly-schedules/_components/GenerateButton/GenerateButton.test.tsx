import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerateButton } from './GenerateButton';

// generateWeeklyShiftsAction のモック
vi.mock('@/app/actions/weeklySchedules', () => ({
	generateWeeklyShiftsAction: vi.fn(),
}));

import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';

describe('GenerateButton', () => {
	const defaultProps = {
		weekStartDate: new Date('2026-01-19T00:00:00+09:00'),
		onGenerated: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('「シフトを生成」ボタンが表示される', () => {
		render(<GenerateButton {...defaultProps} />);

		expect(
			screen.getByRole('button', { name: /シフトを生成/ }),
		).toBeInTheDocument();
	});

	it('クリック時に generateWeeklyShiftsAction が呼ばれる', async () => {
		const user = userEvent.setup();
		vi.mocked(generateWeeklyShiftsAction).mockResolvedValue({
			data: { created: 5, skipped: 0, total: 5 },
			error: null,
			status: 200,
		});

		render(<GenerateButton {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: /シフトを生成/ }));

		expect(generateWeeklyShiftsAction).toHaveBeenCalledWith('2026-01-19');
	});

	it('成功時に onGenerated が呼ばれる', async () => {
		const user = userEvent.setup();
		const onGenerated = vi.fn();
		vi.mocked(generateWeeklyShiftsAction).mockResolvedValue({
			data: { created: 5, skipped: 2, total: 7 },
			error: null,
			status: 200,
		});

		render(<GenerateButton {...defaultProps} onGenerated={onGenerated} />);

		await user.click(screen.getByRole('button', { name: /シフトを生成/ }));

		await waitFor(() => {
			expect(onGenerated).toHaveBeenCalledWith({
				created: 5,
				skipped: 2,
				total: 7,
			});
		});
	});

	it('処理中はローディング状態になる', async () => {
		const user = userEvent.setup();
		let resolvePromise: (value: unknown) => void;
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});
		vi.mocked(generateWeeklyShiftsAction).mockReturnValue(promise as never);

		render(<GenerateButton {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: /シフトを生成/ }));

		// ローディング中はボタンが無効化
		expect(screen.getByRole('button')).toBeDisabled();

		// Promise を解決
		resolvePromise!({
			data: { created: 0, skipped: 0 },
			error: null,
			status: 200,
		});
	});

	it('disabled が true の場合はボタンが無効化される', () => {
		render(<GenerateButton {...defaultProps} disabled />);

		expect(screen.getByRole('button')).toBeDisabled();
	});
});
