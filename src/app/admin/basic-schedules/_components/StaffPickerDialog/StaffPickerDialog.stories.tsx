import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { StaffPickerDialog, StaffPickerOption } from './StaffPickerDialog';

const staffOptions: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'admin',
		serviceTypeNames: ['身体介護', '生活援助'],
		note: '夜間可',
	},
	{
		id: 'staff-2',
		name: '佐藤花子',
		role: 'helper',
		serviceTypeNames: ['身体介護'],
		note: null,
	},
	{
		id: 'staff-3',
		name: '田中一郎',
		role: 'helper',
		serviceTypeNames: ['通院サポート'],
		note: '土日のみ',
	},
];

const meta = {
	title: 'Admin/BasicSchedules/StaffPickerDialog',
	component: StaffPickerDialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		isOpen: true,
		staffOptions,
		onClose: fn(),
		onSelect: fn(),
		onClear: fn(),
	},
} satisfies Meta<typeof StaffPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const StatefulWrapper = (props: Story['args']) => {
	const [selected, setSelected] = useState<string | null>(props?.selectedStaffId ?? null);
	return (
		<StaffPickerDialog
			{...props}
			selectedStaffId={selected}
			onSelect={(staffId) => {
				setSelected(staffId);
				props?.onSelect?.(staffId);
			}}
			onClose={() => props?.onClose?.()}
			onClear={() => {
				setSelected(null);
				props?.onClear?.();
			}}
		/>
	);
};

export const Default: Story = {
	render: (args) => <StatefulWrapper {...args} />,
};

export const Empty: Story = {
	args: {
		staffOptions: [],
	},
	render: (args) => <StatefulWrapper {...args} />,
};

export const WithSelected: Story = {
	args: {
		selectedStaffId: 'staff-2',
	},
	render: (args) => <StatefulWrapper {...args} />,
};
