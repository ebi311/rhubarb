import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ServiceTypeOption } from '../../_types';
import { ServiceTypeSelector } from './ServiceTypeSelector';

const serviceTypes: ServiceTypeOption[] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活支援' },
	{ id: 'commute-support', name: '通院サポート' },
];

describe('ServiceTypeSelector', () => {
	it('サービス区分のチェックボックスを描画する', () => {
		const handleChange = vi.fn();
		render(
			<ServiceTypeSelector
				options={serviceTypes}
				selectedIds={['physical-care']}
				onChange={handleChange}
			/>,
		);

		expect(screen.getByLabelText('身体介護')).toBeChecked();
		expect(screen.getByLabelText('生活支援')).not.toBeChecked();
		expect(screen.getByLabelText('通院サポート')).not.toBeChecked();
	});

	it('個別のサービス区分をトグルするとonChangeが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		render(<ServiceTypeSelector options={serviceTypes} selectedIds={[]} onChange={handleChange} />);

		await user.click(screen.getByLabelText('生活支援'));

		expect(handleChange).toHaveBeenCalledWith(['life-support']);
	});

	it('全選択ボタンで全てのサービス区分を選択/解除できる', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		const { rerender } = render(
			<ServiceTypeSelector
				options={serviceTypes}
				selectedIds={['physical-care']}
				onChange={handleChange}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '全選択' }));
		expect(handleChange).toHaveBeenCalledWith(['physical-care', 'life-support', 'commute-support']);

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
