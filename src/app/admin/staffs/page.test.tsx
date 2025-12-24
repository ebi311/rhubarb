import {
	listServiceTypesAction,
	listStaffsAction,
	type ServiceTypeOption,
} from '@/app/actions/staffs';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffListPage } from './_components/StaffListPage';
import StaffsPage from './page';

const mockListStaffsAction = vi.fn();
const mockListServiceTypesAction = vi.fn();
const mockStaffListPage = vi.fn(({ initialStaffs, serviceTypes }) => (
	<div data-testid="staff-page-client">
		<span data-testid="staff-count">{initialStaffs.length}</span>
		<span data-testid="service-type-count">{serviceTypes.length}</span>
	</div>
));
vi.mock('@/app/actions/staffs');

vi.mock('./_components/StaffListPage');
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(listStaffsAction).mockImplementation(mockListStaffsAction);
	vi.mocked(listServiceTypesAction).mockImplementation(mockListServiceTypesAction);
	vi.mocked(StaffListPage).mockImplementation(mockStaffListPage);
});

describe('AdminStaffsPage', () => {
	const sampleStaffs: StaffRecord[] = [
		{
			id: 'staff-1',
			office_id: 'office-1',
			auth_user_id: null,
			name: '山田太郎',
			role: 'admin',
			email: 'yamada@example.com',
			note: null,
			service_type_ids: ['svc-1'],
			created_at: new Date('2025-01-01T00:00:00Z'),
			updated_at: new Date('2025-01-02T00:00:00Z'),
		},
	];

	const serviceTypes: ServiceTypeOption[] = [
		{ id: 'svc-1', name: '身体介護' },
		{ id: 'svc-2', name: '生活援助' },
	];

	const successResult = <T,>(data: T) => ({ data, error: null, status: 200 });

	it('スタッフとサービス区分を読み込みクライアントを描画する', async () => {
		mockListStaffsAction.mockResolvedValue(successResult(sampleStaffs));
		mockListServiceTypesAction.mockResolvedValue(successResult(serviceTypes));

		const searchParams = vi.fn().mockResolvedValue({}) as any;
		render(await StaffsPage({ searchParams }));

		expect(mockListStaffsAction).toHaveBeenCalledTimes(1);
		expect(mockListServiceTypesAction).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('staff-count')).toHaveTextContent('1');
		expect(screen.getByTestId('service-type-count')).toHaveTextContent('2');
	});

	it('エラー時は空配列で描画しログを出力する', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockListStaffsAction.mockResolvedValue({ data: null, error: 'Unauthorized', status: 401 });
		mockListServiceTypesAction.mockResolvedValue({ data: null, error: 'Forbidden', status: 403 });

		const searchParams = vi.fn().mockResolvedValue({}) as any;
		render(await StaffsPage({ searchParams }));

		expect(screen.getByTestId('staff-count')).toHaveTextContent('0');
		expect(screen.getByTestId('service-type-count')).toHaveTextContent('0');
		expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
		consoleErrorSpy.mockRestore();
	});
});
