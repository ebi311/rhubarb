import { createStaffAction, updateStaffAction } from '@/app/actions/staffs';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceTypeOption } from '../../_types';
import { StaffFormModal } from './StaffFormModal';

vi.mock('@/app/actions/staffs', () => ({
	createStaffAction: vi.fn(),
	updateStaffAction: vi.fn(),
}));

const handleActionResultMock = vi.fn();
vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: handleActionResultMock,
	}),
}));

const serviceTypes: ServiceTypeOption[] = [
	{ id: '019b1d20-0000-4000-8000-000000000111', name: '身体介護' },
	{ id: '019b1d20-0000-4000-8000-000000000222', name: '生活援助' },
];

const sampleStaff: StaffRecord = {
	id: 'staff-1',
	office_id: 'office-1',
	auth_user_id: null,
	name: '山田太郎',
	role: 'helper',
	email: 'yamada@example.com',
	note: 'メモ',
	service_type_ids: ['019b1d20-0000-4000-8000-000000000111'],
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-02T00:00:00Z'),
};

const successResult = <T,>(data: T, status = 200) => ({ data, error: null, status });
const errorResult = (message: string, status = 400) => ({ data: null, error: message, status });

describe('StaffFormModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		handleActionResultMock.mockReset();
		handleActionResultMock.mockReturnValue(true);
	});

	it('作成モードで初期状態のフォームが表示される', () => {
		render(<StaffFormModal isOpen mode="create" serviceTypes={serviceTypes} onClose={vi.fn()} />);

		expect(screen.getByText('担当者を追加')).toBeInTheDocument();
		expect(screen.getByLabelText('氏名 *')).toHaveValue('');
		expect(screen.getByLabelText('メールアドレス')).toHaveValue('');
		expect(screen.getByLabelText('備考 (最大500文字)')).toHaveValue('');
	});

	it('編集モードで既存の担当者情報を表示する', () => {
		render(
			<StaffFormModal
				isOpen
				mode="edit"
				staff={sampleStaff}
				serviceTypes={serviceTypes}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByDisplayValue('山田太郎')).toBeInTheDocument();
		expect(screen.getByDisplayValue('yamada@example.com')).toBeInTheDocument();
		expect(screen.getByLabelText('身体介護')).toBeChecked();
	});

	it('作成モードで入力し送信するとcreateStaffActionが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		const handleSuccess = vi.fn();
		vi.mocked(createStaffAction).mockResolvedValue(successResult(sampleStaff, 201));

		render(
			<StaffFormModal
				isOpen
				mode="create"
				serviceTypes={serviceTypes}
				onClose={handleClose}
				onSuccess={handleSuccess}
			/>,
		);

		await user.type(screen.getByLabelText('氏名 *'), '佐藤花子');
		await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
		await user.click(screen.getByLabelText('ヘルパー'));
		await user.type(screen.getByLabelText('備考 (最大500文字)'), 'テスト備考');
		await user.click(screen.getByLabelText('生活援助'));

		await user.click(screen.getByRole('button', { name: '登録' }));

		await waitFor(() => {
			expect(createStaffAction).toHaveBeenCalledWith({
				name: '佐藤花子',
				email: 'hanako@example.com',
				role: 'helper',
				note: 'テスト備考',
				service_type_ids: ['019b1d20-0000-4000-8000-000000000222'],
			});
		});

		expect(handleSuccess).toHaveBeenCalledWith(sampleStaff);
		expect(handleClose).toHaveBeenCalled();
		expect(handleActionResultMock).toHaveBeenCalled();
	});

	it('編集モードで更新するとupdateStaffActionが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		vi.mocked(updateStaffAction).mockResolvedValue(successResult(sampleStaff));

		render(
			<StaffFormModal
				isOpen
				mode="edit"
				staff={sampleStaff}
				serviceTypes={serviceTypes}
				onClose={handleClose}
			/>,
		);

		await user.clear(screen.getByDisplayValue('山田太郎'));
		await user.type(screen.getByLabelText('氏名 *'), '山田次郎');
		await user.click(screen.getByRole('button', { name: '保存' }));

		await waitFor(() => {
			expect(updateStaffAction).toHaveBeenCalledWith('staff-1', {
				name: '山田次郎',
				email: 'yamada@example.com',
				role: 'helper',
				note: 'メモ',
				service_type_ids: ['019b1d20-0000-4000-8000-000000000111'],
			});
		});

		expect(handleClose).toHaveBeenCalled();
		expect(handleActionResultMock).toHaveBeenCalled();
	});

	it('API エラー時にエラーメッセージを表示する', async () => {
		const user = userEvent.setup();
		vi.mocked(createStaffAction).mockResolvedValue(errorResult('Validation failed'));
		handleActionResultMock.mockReturnValue(false);

		render(<StaffFormModal isOpen mode="create" serviceTypes={serviceTypes} onClose={vi.fn()} />);

		await user.type(screen.getByLabelText('氏名 *'), '佐藤花子');
		await user.click(screen.getByRole('button', { name: '登録' }));

		await waitFor(() => {
			expect(screen.getByText('Validation failed')).toBeInTheDocument();
		});
	});
});
