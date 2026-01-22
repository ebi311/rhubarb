import { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ChangeStaffDialog } from './ChangeStaffDialog';

const meta = {
	title: 'Admin/WeeklySchedules/ChangeStaffDialog',
	component: ChangeStaffDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	args: {
		onClose: fn(),
		onSuccess: fn(),
	},
} satisfies Meta<typeof ChangeStaffDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockStaffOptions: StaffPickerOption[] = [
	{ id: 'staff-1', name: '山田太郎', role: 'helper' as const, serviceTypeIds: ['life-support'] },
	{
		id: 'staff-2',
		name: '鈴木花子',
		role: 'helper' as const,
		serviceTypeIds: ['physical-care'],
	},
	{ id: 'staff-3', name: '佐藤次郎', role: 'admin' as const, serviceTypeIds: ['life-support'] },
];

const mockShift = {
	id: 'shift-1',
	clientName: '田中太郎',
	serviceTypeName: '生活援助',
	date: new Date('2026-01-22'),
	startTime: new Date('2026-01-22T09:00:00+09:00'),
	endTime: new Date('2026-01-22T12:00:00+09:00'),
	currentStaffName: '佐藤次郎',
	currentStaffId: 'staff-3',
};

export const Default: Story = {
	args: {
		isOpen: true,
		shift: mockShift,
		staffOptions: mockStaffOptions,
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
		shift: mockShift,
		staffOptions: mockStaffOptions,
	},
};

export const WithUnassignedShift: Story = {
	args: {
		isOpen: true,
		shift: {
			...mockShift,
			currentStaffName: '未割当',
			currentStaffId: null,
		},
		staffOptions: mockStaffOptions,
	},
};
