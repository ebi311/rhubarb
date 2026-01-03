import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StaffPickerFilters } from './StaffPickerFilters';
import type { RoleFilter } from './types';

const roleFilterOptions: Array<{ label: string; value: RoleFilter }> = [
	{ label: 'すべて', value: 'all' },
	{ label: '管理者', value: 'admin' },
];

describe('StaffPickerFilters', () => {
	it('呼び出し時に各ハンドラを実行する', async () => {
		const user = userEvent.setup();
		const handleKeywordChange = vi.fn();
		const handleRoleFilterChange = vi.fn();
		const handleServiceFilterChange = vi.fn();
		const handleClear = vi.fn();

		render(
			<StaffPickerFilters
				keyword=""
				roleFilter="all"
				serviceFilter="all"
				serviceTypeOptions={['身体介護']}
				roleFilterOptions={roleFilterOptions}
				onKeywordChange={handleKeywordChange}
				onRoleFilterChange={handleRoleFilterChange}
				onServiceFilterChange={handleServiceFilterChange}
				onClear={handleClear}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText('氏名・サービス区分で検索'), {
			target: { value: 'taro' },
		});
		expect(handleKeywordChange).toHaveBeenLastCalledWith('taro');

		await user.selectOptions(screen.getByDisplayValue('すべて'), '管理者');
		expect(handleRoleFilterChange).toHaveBeenLastCalledWith('admin');

		await user.selectOptions(screen.getByDisplayValue('すべてのサービス区分'), '身体介護');
		expect(handleServiceFilterChange).toHaveBeenLastCalledWith('身体介護');

		await user.click(screen.getByRole('button', { name: '選択をクリア' }));
		expect(handleClear).toHaveBeenCalledTimes(1);
	});

	it('onClear が無い場合はボタンを表示しない', () => {
		render(
			<StaffPickerFilters
				keyword=""
				roleFilter="all"
				serviceFilter="all"
				serviceTypeOptions={[]}
				roleFilterOptions={roleFilterOptions}
				onKeywordChange={() => {}}
				onRoleFilterChange={() => {}}
				onServiceFilterChange={() => {}}
			/>,
		);

		expect(screen.queryByRole('button', { name: '選択をクリア' })).not.toBeInTheDocument();
	});
});
