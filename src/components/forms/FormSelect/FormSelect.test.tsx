import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormSelect } from './FormSelect';

const baseOptions = [
	{ value: '', label: 'すべて' },
	{ value: 'option-1', label: 'Option 1' },
];

describe('FormSelect', () => {
	it('デフォルトのクラスで options を描画する', () => {
		render(
			<FormSelect
				value=""
				onChange={() => {}}
				options={baseOptions}
				aria-label="select"
			/>,
		);

		const select = screen.getByLabelText('select');
		expect(select).toHaveClass('select select-bordered');
		expect(select).toHaveValue('');
		expect(select.querySelectorAll('option')).toHaveLength(baseOptions.length);
	});

	it('className を上書きできる', () => {
		render(
			<FormSelect
				className="select-bordered select w-40"
				value="option-1"
				onChange={() => {}}
				options={baseOptions}
				aria-label="custom"
			/>,
		);

		const select = screen.getByLabelText('custom');
		expect(select).toHaveClass('select select-bordered w-40');
		expect(select).toHaveValue('option-1');
	});

	it('onChange が呼ばれ、disabled option をサポートする', () => {
		const options = [
			...baseOptions,
			{ value: 'disabled', label: 'Disabled option', disabled: true },
		];
		const handleChange = vi.fn();

		render(
			<FormSelect
				value=""
				onChange={handleChange}
				options={options}
				aria-label="change"
			/>,
		);

		fireEvent.change(screen.getByLabelText('change'), {
			target: { value: 'option-1' },
		});
		expect(handleChange).toHaveBeenCalledTimes(1);

		const disabledOption = screen.getByText('Disabled option');
		expect(disabledOption).toBeDisabled();
	});
});
