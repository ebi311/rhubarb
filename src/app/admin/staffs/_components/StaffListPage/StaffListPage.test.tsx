import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceTypeOption } from '../../_types';
import { StaffListPage } from './StaffListPage';

vi.mock('next/navigation');

const replaceMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(useRouter).mockReturnValue({
		replace: replaceMock,
	} as any);
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
});
