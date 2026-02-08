'use client';

import type { ServiceUser } from '@/models/serviceUser';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClientModal } from './ClientModal';

const mockClient: ServiceUser = {
	id: '019b179f-c8ec-7098-a1d7-7d2dc84f4b8d',
	office_id: '019b179f-c74d-75ef-a328-55a8f65a0d8a',
	name: '山田太郎',
	address: '東京都千代田区丸の内1-1-1',
	contract_status: 'active',
	created_at: new Date('2025-12-13T10:00:00Z'),
	updated_at: new Date('2025-12-13T10:00:00Z'),
};

describe('ClientModal', () => {
	it('新規作成モードで空のフォームが表示される', () => {
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByText('利用者の新規登録')).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: /氏名/ })).toHaveValue('');
		expect(screen.getByRole('textbox', { name: /住所/ })).toHaveValue('');
		expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument();
	});

	it('編集モードで既存データが入力済みで表示される', () => {
		render(
			<ClientModal
				isOpen={true}
				mode="edit"
				client={mockClient}
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByText('利用者情報の編集')).toBeInTheDocument();
		expect(screen.getByDisplayValue('山田太郎')).toBeInTheDocument();
		expect(
			screen.getByDisplayValue('東京都千代田区丸の内1-1-1'),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
	});

	it('編集モードで契約ステータス切り替えが表示される', () => {
		render(
			<ClientModal
				isOpen={true}
				mode="edit"
				client={mockClient}
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText('契約中')).toBeInTheDocument();
		expect(screen.getByLabelText('中断中')).toBeInTheDocument();
	});

	it('中断選択時に警告メッセージが表示される', async () => {
		const user = userEvent.setup();
		render(
			<ClientModal
				isOpen={true}
				mode="edit"
				client={mockClient}
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		await user.click(screen.getByLabelText('中断中'));

		expect(
			screen.getByText(
				/契約を中断すると、この利用者は新規スケジュール作成時に選択できなくなります/,
			),
		).toBeInTheDocument();
	});

	it('バリデーションエラーがある場合はボタンが無効化される', async () => {
		const user = userEvent.setup();
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		// 初期状態では空なのでボタンが無効
		const submitButton = screen.getByRole('button', { name: '登録' });
		expect(submitButton).toBeDisabled();

		// 氏名を入力（住所は optional なので空でもOK）
		const nameInput = screen.getByRole('textbox', { name: /氏名/ });

		await user.type(nameInput, 'テスト太郎');
		await user.tab(); // バリデーションをトリガー

		// 氏名が入力されたのでボタンが有効
		await waitFor(() => {
			expect(submitButton).toBeEnabled();
		});
	});

	it('必須項目が未入力の場合、エラーメッセージが表示される', async () => {
		const user = userEvent.setup();
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		const nameInput = screen.getByRole('textbox', { name: /氏名/ });
		const addressInput = screen.getByRole('textbox', { name: /住所/ });

		// 氏名フィールドにフォーカスして離れる（バリデーショントリガー）
		await user.click(nameInput);
		await user.click(addressInput);

		// 氏名のエラーメッセージが表示される
		await waitFor(() => {
			expect(screen.getByText('氏名は必須です')).toBeInTheDocument();
		});

		// 住所は optional なのでエラーは表示されない
		expect(screen.queryByText('住所は必須です')).not.toBeInTheDocument();
	});

	it('空白のみの入力の場合、エラーメッセージが表示される', async () => {
		const user = userEvent.setup();
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		const nameInput = screen.getByRole('textbox', { name: /氏名/ });
		const addressInput = screen.getByRole('textbox', { name: /住所/ });

		// 氏名に空白のみ入力
		await user.type(nameInput, '   ');
		await user.click(addressInput);

		await waitFor(() => {
			expect(
				screen.getByText('氏名に空白のみは使用できません'),
			).toBeInTheDocument();
		});

		// 住所に空白のみ入力した場合も空白エラーが表示される
		await user.type(addressInput, '   ');
		await user.click(nameInput);

		await waitFor(() => {
			expect(
				screen.getByText('住所に空白のみは使用できません'),
			).toBeInTheDocument();
		});
	});

	it('保存ボタンクリックでonSubmitが呼ばれる（作成）', async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={handleSubmit}
			/>,
		);

		const nameInput = screen.getByRole('textbox', { name: /氏名/ });

		await user.type(nameInput, 'テスト太郎');
		await user.tab(); // バリデーションをトリガー

		// ボタンが有効になるのを待つ
		const submitButton = screen.getByRole('button', { name: '登録' });
		await waitFor(() => {
			expect(submitButton).toBeEnabled();
		});

		await user.click(submitButton);

		await waitFor(() => {
			expect(handleSubmit).toHaveBeenCalledWith({
				name: 'テスト太郎',
				address: '',
			});
		});
	});

	it('保存ボタンクリックでonSubmitが呼ばれる（編集）', async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn();
		render(
			<ClientModal
				isOpen={true}
				mode="edit"
				client={mockClient}
				onClose={vi.fn()}
				onSubmit={handleSubmit}
			/>,
		);

		const nameInput = screen.getByDisplayValue('山田太郎');
		await user.clear(nameInput);
		await user.type(nameInput, '山田次郎');
		await user.click(screen.getByRole('button', { name: '保存' }));

		await waitFor(() => {
			expect(handleSubmit).toHaveBeenCalledWith(
				{
					name: '山田次郎',
					address: '東京都千代田区丸の内1-1-1',
				},
				'active',
			);
		});
	});

	it('キャンセルボタンクリックでonCloseが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={handleClose}
				onSubmit={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));
		expect(handleClose).toHaveBeenCalled();
	});

	it('新規作成モードでは契約ステータスが表示されない', () => {
		render(
			<ClientModal
				isOpen={true}
				mode="create"
				onClose={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.queryByLabelText('契約中')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('中断中')).not.toBeInTheDocument();
	});
});
