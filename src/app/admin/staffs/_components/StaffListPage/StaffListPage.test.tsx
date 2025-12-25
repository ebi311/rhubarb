import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceTypeOption } from '../../_types';
import { DeleteStaffDialog } from '../DeleteStaffDialog';
import { StaffFormModal } from '../StaffFormModal';
import { StaffListPage } from './StaffListPage';

vi.mock('next/navigation');
const StaffFormModalMock = vi.fn((props: any) => {
	if (!props.isOpen) return null;
	const handleClick = () => {
		if (props.mode === 'create') {
			props.onSuccess?.({
				id: 'staff-created',
				office_id: 'office-1',
				auth_user_id: null,
				name: '新規担当者',
				role: 'helper',
				email: 'new@example.com',
				note: null,
				service_type_ids: ['svc-1'],
				created_at: new Date('2025-01-03T00:00:00Z'),
				updated_at: new Date('2025-01-03T00:00:00Z'),
			});
		} else if (props.staff) {
			props.onSuccess?.({ ...props.staff, name: `${props.staff.name}（更新）` });
		}
		props.onClose();
	};
	return (
		<div data-testid={`staff-form-${props.mode}`}>
			<button type="button" onClick={handleClick}>
				{props.mode === 'create' ? 'create-submit' : 'edit-submit'}
			</button>
		</div>
	);
});

const DeleteStaffDialogMock = vi.fn((props: any) => {
	if (!props.isOpen) return null;
	const handleDelete = () => {
		props.onDeleted?.(props.staff.id);
		props.onClose();
	};
	return (
		<div data-testid="delete-dialog">
			<button type="button" onClick={handleDelete}>
				delete-confirm
			</button>
		</div>
	);
});

vi.mock('../StaffFormModal');

vi.mock('../DeleteStaffDialog');

const replaceMock = vi.fn();
const refreshMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	replaceMock.mockReset();
	refreshMock.mockReset();
	StaffFormModalMock.mockClear();
	DeleteStaffDialogMock.mockClear();
	vi.mocked(useRouter).mockReturnValue({
		replace: replaceMock,
		refresh: refreshMock,
	} as any);
	vi.mocked(StaffFormModal).mockImplementation(StaffFormModalMock);
	vi.mocked(DeleteStaffDialog).mockImplementation(DeleteStaffDialogMock);
});

const buildStaff = (overrides: Partial<StaffRecord> = {}): StaffRecord => ({
	id: '019b1d20-0000-4000-8000-000000000999',
	office_id: '019b1d20-0000-4000-8000-000000000100',
	auth_user_id: null,
	name: '山田太郎',
	role: 'admin',
	email: 'yamada@example.com',
	note: null,
	service_type_ids: ['svc-1'],
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-02T00:00:00Z'),
	...overrides,
});

describe('StaffListPageClient', () => {
	const serviceTypes: ServiceTypeOption[] = [
		{ id: 'svc-1', name: '身体介護' },
		{ id: 'svc-2', name: '生活援助' },
	];

	it('担当者一覧を表示する', () => {
		render(
			<StaffListPage
				initialStaffs={[
					buildStaff(),
					buildStaff({ id: 'staff-2', name: '佐藤花子', role: 'helper' }),
				]}
				serviceTypes={serviceTypes}
				filters={{ query: '', role: 'all' }}
			/>,
		);

		expect(screen.getByText('担当者管理')).toBeInTheDocument();
		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
		expect(screen.getAllByText('身体介護')).toHaveLength(2);
	});

	it('検索フィルタで結果を絞り込む', () => {
		render(
			<StaffListPage
				initialStaffs={[buildStaff(), buildStaff({ id: 'staff-2', name: '佐藤花子' })]}
				serviceTypes={serviceTypes}
				filters={{ query: '佐藤花子', role: 'all' }}
			/>,
		);

		expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('新規作成完了後に一覧へ追加する', async () => {
		const user = userEvent.setup();
		render(
			<StaffListPage
				initialStaffs={[buildStaff()]}
				serviceTypes={serviceTypes}
				filters={{ query: '', role: 'all' }}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '＋ 担当者を追加' }));
		expect(screen.getByTestId('staff-form-create')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'create-submit' }));

		expect(await screen.findByText('新規担当者')).toBeInTheDocument();
		expect(refreshMock).toHaveBeenCalled();
	});

	it('編集完了後に該当行を更新する', async () => {
		const user = userEvent.setup();
		render(
			<StaffListPage
				initialStaffs={[buildStaff(), buildStaff({ id: 'staff-2', name: '佐藤花子' })]}
				serviceTypes={serviceTypes}
				filters={{ query: '', role: 'all' }}
			/>,
		);

		await user.click(screen.getAllByRole('button', { name: '編集' })[0]);
		expect(screen.getByTestId('staff-form-edit')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'edit-submit' }));

		expect(await screen.findByText('山田太郎（更新）')).toBeInTheDocument();
		expect(refreshMock).toHaveBeenCalled();
	});

	it('削除完了後に一覧から除外する', async () => {
		const user = userEvent.setup();
		render(
			<StaffListPage
				initialStaffs={[buildStaff(), buildStaff({ id: 'staff-2', name: '佐藤花子' })]}
				serviceTypes={serviceTypes}
				filters={{ query: '', role: 'all' }}
			/>,
		);

		await user.click(screen.getAllByRole('button', { name: '削除' })[1]);
		expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'delete-confirm' }));

		expect(screen.queryByText('佐藤花子')).not.toBeInTheDocument();
		expect(refreshMock).toHaveBeenCalled();
	});
});
