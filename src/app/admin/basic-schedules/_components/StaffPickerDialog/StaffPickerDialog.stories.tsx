import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { StaffPickerDialog, StaffPickerOption } from './StaffPickerDialog';
import type { StaffPickerDialogProps } from './types';

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

const baseArgs: StaffPickerDialogProps = {
	isOpen: true,
	staffOptions,
	selectedStaffId: null,
	onClose: fn(),
	onSelect: fn(),
	onClear: fn(),
};

const meta = {
	title: 'Admin/BasicSchedules/StaffPickerDialog',
	component: StaffPickerDialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: baseArgs,
} satisfies Meta<typeof StaffPickerDialog>;

export default meta;
type Story = StoryObj<typeof StaffPickerDialog>;

const ensureProps = (args?: Story['args']): StaffPickerDialogProps => ({
	...baseArgs,
	...args,
});

const StatefulWrapper = (props: StaffPickerDialogProps) => {
	const { selectedStaffId, onSelect, onClear, ...rest } = props;
	const [selected, setSelected] = useState<string | null>(selectedStaffId);

	useEffect(() => {
		setSelected(selectedStaffId);
	}, [selectedStaffId]);
	return (
		<StaffPickerDialog
			{...rest}
			selectedStaffId={selected}
			onSelect={(staffId) => {
				setSelected(staffId);
				onSelect(staffId);
			}}
			onClear={() => {
				setSelected(null);
				onClear?.();
			}}
		/>
	);
};

export const Default: Story = {
	render: (args) => <StatefulWrapper {...ensureProps(args)} />,
};

export const Empty: Story = {
	args: {
		staffOptions: [],
	},
	render: (args) => <StatefulWrapper {...ensureProps(args)} />,
};

export const WithSelected: Story = {
	args: {
		selectedStaffId: 'staff-2',
	},
	render: (args) => <StatefulWrapper {...ensureProps(args)} />,
};
