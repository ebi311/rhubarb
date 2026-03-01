import { formatJstDateString, setJstTime } from '@/utils/date';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StepDatetimeInput } from './StepDatetimeInput';

describe('StepDatetimeInput', () => {
	it('初期値を表示し、入力後に候補表示へ遷移する', async () => {
		const user = userEvent.setup();
		const onShowCandidates = vi.fn();
		const initialStart = setJstTime(new Date('2026-02-22T00:00:00Z'), 9, 0);
		const initialEnd = setJstTime(new Date('2026-02-22T00:00:00Z'), 10, 0);

		render(
			<StepDatetimeInput
				initialStartTime={initialStart}
				initialEndTime={initialEnd}
				onShowCandidates={onShowCandidates}
			/>,
		);

		expect(screen.getByLabelText('日付')).toHaveValue('2026-02-22');
		expect(screen.getByLabelText('開始時刻')).toHaveValue('09:00');
		expect(screen.getByLabelText('終了時刻')).toHaveValue('10:00');

		await user.clear(screen.getByLabelText('日付'));
		await user.type(screen.getByLabelText('日付'), '2026-02-24');
		await user.clear(screen.getByLabelText('開始時刻'));
		await user.type(screen.getByLabelText('開始時刻'), '13:30');
		await user.clear(screen.getByLabelText('終了時刻'));
		await user.type(screen.getByLabelText('終了時刻'), '15:00');

		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		expect(onShowCandidates).toHaveBeenCalledTimes(1);
		const [payload] = onShowCandidates.mock.calls[0] ?? [];
		expect(formatJstDateString(payload.newStartTime)).toBe('2026-02-24');
		expect(formatJstDateString(payload.newEndTime)).toBe('2026-02-24');
	});

	it('開始時刻が終了時刻以上ならバリデーションエラーを表示する', async () => {
		const user = userEvent.setup();
		const onShowCandidates = vi.fn();

		render(
			<StepDatetimeInput
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onShowCandidates={onShowCandidates}
			/>,
		);

		await user.clear(screen.getByLabelText('開始時刻'));
		await user.type(screen.getByLabelText('開始時刻'), '11:00');
		await user.clear(screen.getByLabelText('終了時刻'));
		await user.type(screen.getByLabelText('終了時刻'), '10:00');
		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		expect(
			screen.getByText('開始時刻は終了時刻より前に設定してください。'),
		).toBeInTheDocument();
		expect(onShowCandidates).not.toHaveBeenCalled();
	});

	it('日付が未入力ならバリデーションエラーを表示する', async () => {
		const user = userEvent.setup();
		const onShowCandidates = vi.fn();

		render(
			<StepDatetimeInput
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onShowCandidates={onShowCandidates}
			/>,
		);

		await user.clear(screen.getByLabelText('日付'));
		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		expect(screen.getByText('日付を入力してください。')).toBeInTheDocument();
		expect(onShowCandidates).not.toHaveBeenCalled();
	});
});
