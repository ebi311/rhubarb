import type { ServiceUser } from '@/models/serviceUser';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientTable } from './ClientTable';

const mockClients: ServiceUser[] = [
	{
		id: '019b179f-c8ec-7098-a1d7-7d2dc84f4b8d',
		office_id: '019b179f-c74d-75ef-a328-55a8f65a0d8a',
		name: '山田太郎',
		address: '東京都千代田区丸の内1-1-1',
		contract_status: 'active',
		created_at: new Date('2025-12-13T10:00:00Z'),
		updated_at: new Date('2025-12-13T10:00:00Z'),
	},
	{
		id: '019b179f-ca00-7291-bb3a-9f2e8c5d1a7b',
		office_id: '019b179f-c74d-75ef-a328-55a8f65a0d8a',
		name: '佐藤花子',
		address: '東京都渋谷区神南1-2-3',
		contract_status: 'suspended',
		created_at: new Date('2025-12-13T10:00:00Z'),
		updated_at: new Date('2025-12-13T11:00:00Z'),
	},
];

describe('ClientTable', () => {
	it('データが表示される', () => {
		render(<ClientTable clients={mockClients} getHref={() => '#'} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('東京都千代田区丸の内1-1-1')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
		expect(screen.getByText('東京都渋谷区神南1-2-3')).toBeInTheDocument();
	});

	it('ステータスバッジが正しく表示される', () => {
		render(<ClientTable clients={mockClients} getHref={() => '#'} />);

		expect(screen.getByText('契約中')).toBeInTheDocument();
		expect(screen.getByText('中断中')).toBeInTheDocument();
	});

	it('各行がクリック可能なリンクになっている', () => {
		render(<ClientTable clients={mockClients} getHref={() => '#'} />);

		// role="row"でaria-labelが設定されたリンク行を取得
		const row1 = screen.getByRole('row', { name: /山田太郎の情報を編集/ });
		const row2 = screen.getByRole('row', { name: /佐藤花子の情報を編集/ });

		expect(row1).toBeInTheDocument();
		expect(row2).toBeInTheDocument();
	});

	it('行のhrefが正しく生成される', () => {
		const getHref = vi.fn((client) => `#edit-${client.id}`);
		render(<ClientTable clients={mockClients} getHref={getHref} />);

		const row = screen.getByRole('row', { name: /山田太郎の情報を編集/ });
		expect(row).toHaveAttribute('href', `#edit-${mockClients[0].id}`);
		expect(getHref).toHaveBeenCalledWith(mockClients[0]);
	});

	it('データがない場合のメッセージが表示される', () => {
		render(<ClientTable clients={[]} getHref={() => '#'} />);

		expect(screen.getByText('利用者がまだ登録されていません')).toBeInTheDocument();
	});

	it('データがない場合は編集リンクが表示されない', () => {
		render(<ClientTable clients={[]} getHref={() => '#'} />);

		const editLinks = screen.queryAllByRole('link', { name: /編集/ });
		expect(editLinks).toHaveLength(0);
	});
});
