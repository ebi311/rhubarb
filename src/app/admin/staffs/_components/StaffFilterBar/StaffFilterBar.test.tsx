import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StaffFilterState } from '../../_types';
import { StaffFilterBar } from './StaffFilterBar';

describe('StaffFilterBar', () => {
	const baseFilters: StaffFilterState = { query: '', role: 'all' };

	it('検索キーワードを入力できる', () => {
		const handleChange = vi.fn();
		render(<StaffFilterBar filters={baseFilters} onChange={handleChange} />);

		fireEvent.change(screen.getByPlaceholderText('氏名・メールで検索'), {
			target: { value: '山田' },
		});

		expect(handleChange).toHaveBeenCalledWith({ ...baseFilters, query: '山田' });
	});

	it('ロールタブでフィルタを変更できる', () => {
		const handleChange = vi.fn();
		render(<StaffFilterBar filters={baseFilters} onChange={handleChange} />);

		fireEvent.click(screen.getByRole('button', { name: '管理者' }));
		expect(handleChange).toHaveBeenCalledWith({ ...baseFilters, role: 'admin' });
	});

	it('リセットボタンで初期状態に戻す', () => {
		const handleChange = vi.fn();
		render(<StaffFilterBar filters={{ query: 'test', role: 'helper' }} onChange={handleChange} />);

		fireEvent.click(screen.getByRole('button', { name: 'リセット' }));
		expect(handleChange).toHaveBeenCalledWith({ query: '', role: 'all' });
	});
});
