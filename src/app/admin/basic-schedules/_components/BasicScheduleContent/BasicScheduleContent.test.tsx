import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleEditFormModalProps } from '../../clients/[clientId]/edit/_components/ScheduleEditFormModal';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import { BasicScheduleContent } from './BasicScheduleContent';

const serviceTypeOptions: ScheduleEditFormModalProps['serviceTypeOptions'] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
];

const staffOptions: ScheduleEditFormModalProps['staffOptions'] = [
	{
		id: 'staff-1',
		name: 'スタッフA',
		role: 'helper',
		serviceTypeIds: ['physical-care', 'life-support'],
		note: '',
	},
	{
		id: 'staff-2',
		name: 'スタッフB',
		role: 'helper',
		serviceTypeIds: ['life-support'],
		note: '',
	},
];
// モック
vi.mock('../BasicScheduleList', () => ({
	BasicScheduleList: () => <div>BasicScheduleList</div>,
}));

vi.mock('../BasicScheduleGrid', () => ({
	BasicScheduleGrid: () => <div>BasicScheduleGrid</div>,
}));

vi.mock('../BasicScheduleGrid/transformToGridViewModel', () => ({
	transformToGridViewModel: vi.fn((schedules) => schedules),
}));

vi.mock('../StaffBasicScheduleGrid', () => ({
	StaffBasicScheduleGrid: () => <div>StaffBasicScheduleGrid</div>,
	transformToStaffGridViewModel: vi.fn((schedules) => schedules),
}));

describe('BasicScheduleContent', () => {
	const mockSchedules: BasicScheduleViewModel[] = [
		{
			id: '1',
			clientId: 'client-1',
			clientName: '山田太郎',
			weekday: 'Mon',
			timeRange: '09:00 - 10:00',
			serviceTypeId: 'physical-care',
			staffNames: ['スタッフA'],
			note: null,
		},
	];

	beforeEach(() => {
		// sessionStorage をモック
		const storage: Record<string, string> = {};
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
			return storage[key] || null;
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
			(key: string, value: string) => {
				storage[key] = value;
			},
		);
	});

	it('初期状態ではリスト表示がレンダリングされる', () => {
		render(
			<BasicScheduleContent
				schedules={mockSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		expect(screen.getByText('BasicScheduleList')).toBeInTheDocument();
	});

	it('sessionStorageにグリッド表示が保存されている場合はグリッド表示がレンダリングされる', () => {
		sessionStorage.setItem('basicScheduleViewMode', 'grid');

		render(
			<BasicScheduleContent
				schedules={mockSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		expect(screen.getByText('BasicScheduleGrid')).toBeInTheDocument();
	});

	it('sessionStorageにスタッフグリッド表示が保存されている場合はスタッフグリッド表示がレンダリングされる', () => {
		sessionStorage.setItem('basicScheduleViewMode', 'staff-grid');

		render(
			<BasicScheduleContent
				schedules={mockSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		expect(screen.getByText('StaffBasicScheduleGrid')).toBeInTheDocument();
	});

	it('ビュー切り替えボタンをクリックすると表示が切り替わる', async () => {
		const user = userEvent.setup();

		render(
			<BasicScheduleContent
				schedules={mockSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		expect(screen.getByText('BasicScheduleList')).toBeInTheDocument();

		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		await user.click(gridButton);

		await waitFor(() => {
			expect(screen.getByText('BasicScheduleGrid')).toBeInTheDocument();
		});

		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');
		await user.click(staffGridButton);

		await waitFor(() => {
			expect(screen.getByText('StaffBasicScheduleGrid')).toBeInTheDocument();
		});
	});

	it('ビューモードがsessionStorageに保存される', async () => {
		const user = userEvent.setup();

		render(
			<BasicScheduleContent
				schedules={mockSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		await user.click(gridButton);

		await waitFor(() => {
			expect(sessionStorage.setItem).toHaveBeenCalledWith(
				'basicScheduleViewMode',
				'grid',
			);
		});
	});
});
