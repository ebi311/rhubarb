import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ServiceTypeOption } from '../../_types';
import { ServiceTypeSelector } from './ServiceTypeSelector';

const serviceTypes: ServiceTypeOption[] = [
	{ id: '019b1d20-0000-4000-8000-000000000111', name: '身体介護' },
	{ id: '019b1d20-0000-4000-8000-000000000222', name: '生活援助' },
	{ id: '019b1d20-0000-4000-8000-000000000333', name: '通院介助' },
];

describe('ServiceTypeSelector', () => {
	it('サービス区分のチェックボックスを描画する', () => {
		const handleChange = vi.fn();
		render(
			<ServiceTypeSelector
				options={serviceTypes}
				selectedIds={['019b1d20-0000-4000-8000-000000000111']}
				onChange={handleChange}
			/>,
		);

		expect(screen.getByLabelText('身体介護')).toBeChecked();
		expect(screen.getByLabelText('生活援助')).not.toBeChecked();
		expect(screen.getByLabelText('通院介助')).not.toBeChecked();
	});

	it('個別のサービス区分をトグルするとonChangeが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		render(<ServiceTypeSelector options={serviceTypes} selectedIds={[]} onChange={handleChange} />);

		await user.click(screen.getByLabelText('生活援助'));

		expect(handleChange).toHaveBeenCalledWith(['019b1d20-0000-4000-8000-000000000222']);
	});

	it('全選択ボタンで全てのサービス区分を選択/解除できる', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		const { rerender } = render(
			<ServiceTypeSelector
				options={serviceTypes}
				selectedIds={['019b1d20-0000-4000-8000-000000000111']}
				onChange={handleChange}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '全選択' }));
		expect(handleChange).toHaveBeenCalledWith([
			'019b1d20-0000-4000-8000-000000000111',
			'019b1d20-0000-4000-8000-000000000222',
			'019b1d20-0000-4000-8000-000000000333',
		]);

		rerender(
			<ServiceTypeSelector
				options={serviceTypes}
				selectedIds={serviceTypes.map((option) => option.id)}
				onChange={handleChange}
			/>,
		);
		await user.click(screen.getByRole('button', { name: '全解除' }));
		expect(handleChange).toHaveBeenLastCalledWith([]);
	});

	it('サービス区分がない場合はメッセージを表示する', () => {
		const handleChange = vi.fn();
		render(<ServiceTypeSelector options={[]} selectedIds={[]} onChange={handleChange} />);

		expect(screen.getByText('サービス区分が登録されていません')).toBeInTheDocument();
	});
});
