import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StaffViewModel } from '../../_types';
import { StaffTable } from './StaffTable';

const mockStaffs: StaffViewModel[] = [
	{
		id: '019b1d20-0000-4000-8000-000000000111',
		name: '山田太郎',
		role: 'admin',
		email: 'yamada@example.com',
		note: '夜間帯対応可能',
		serviceTypeIds: ['physical-care', 'life-support'],
		updatedAt: '2025/01/01 10:00',
	},
	{
		id: '019b1d20-0000-4000-8000-000000000222',
		name: '佐藤花子',
		role: 'helper',
		email: null,
		note: null,
		serviceTypeIds: [],
		updatedAt: '2025/01/02 09:00',
	},
];

describe('StaffTable', () => {
	it('担当者情報を表示する', () => {
		render(<StaffTable staffs={mockStaffs} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('生活支援')).toBeInTheDocument();
		expect(screen.getByText('未割当')).toBeInTheDocument();
	});

	it('データがない場合はメッセージを表示する', () => {
		render(<StaffTable staffs={[]} />);

		expect(screen.getByText('該当する担当者がいません')).toBeInTheDocument();
	});

	it('編集・削除ボタンの操作をハンドラへ伝播する', async () => {
		const user = userEvent.setup();
		const handleEdit = vi.fn();
		const handleDelete = vi.fn();

		render(
			<StaffTable
				staffs={mockStaffs}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>,
		);

		await user.click(screen.getAllByRole('button', { name: '編集' })[0]);
		await user.click(screen.getAllByRole('button', { name: '削除' })[1]);

		expect(handleEdit).toHaveBeenCalledWith(
			'019b1d20-0000-4000-8000-000000000111',
		);
		expect(handleDelete).toHaveBeenCalledWith(
			'019b1d20-0000-4000-8000-000000000222',
		);
	});
});
