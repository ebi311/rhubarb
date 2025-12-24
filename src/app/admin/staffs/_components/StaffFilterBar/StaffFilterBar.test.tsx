import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffFilterState } from '../../_types';
import { StaffFilterBar } from './StaffFilterBar';

vi.mock('next/navigation');

const replaceMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(useRouter).mockReturnValue({
		replace: replaceMock,
	} as any);
});

describe('StaffFilterBar', () => {
	const baseFilters: StaffFilterState = { query: '', role: 'all' };

	it('検索キーワードを入力できる', () => {
		render(<StaffFilterBar filters={baseFilters} />);

		fireEvent.change(screen.getByPlaceholderText('氏名・メールで検索'), {
			target: { value: '山田' },
		});

		expect(replaceMock).toHaveBeenCalledWith('?query=%E5%B1%B1%E7%94%B0');
	});

	it('ロールタブでフィルタを変更できる', () => {
		render(<StaffFilterBar filters={baseFilters} />);

		fireEvent.click(screen.getByRole('button', { name: '管理者' }));
		expect(replaceMock).toHaveBeenCalledWith('?role=admin');
	});

	it('リセットボタンで初期状態に戻す', () => {
		render(<StaffFilterBar filters={{ query: 'test', role: 'helper' }} />);

		fireEvent.click(screen.getByRole('button', { name: 'リセット' }));
		expect(replaceMock).toHaveBeenCalledWith('?');
	});
});
