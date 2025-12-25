import type { StaffRecord } from '@/models/staffActionSchemas';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ServiceTypeOption } from '../../_types';
import { StaffFormModal } from './StaffFormModal';

const serviceTypes: ServiceTypeOption[] = [
	{ id: 'svc-1', name: '身体介護' },
	{ id: 'svc-2', name: '生活援助' },
	{ id: 'svc-3', name: '通院介助' },
];

const staff: StaffRecord = {
	id: 'staff-1',
	office_id: 'office-1',
	auth_user_id: null,
	name: '山田太郎',
	role: 'admin',
	email: 'yamada@example.com',
	note: '既存の備考',
	service_type_ids: ['svc-1', 'svc-3'],
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-02T00:00:00Z'),
};

const meta = {
	title: 'Admin/Staffs/StaffFormModal',
	component: StaffFormModal,
	args: {
		isOpen: true,
		serviceTypes,
		onClose: fn(),
		onSuccess: fn(),
	},
	parameters: {
		layout: 'centered',
	},
} satisfies Meta<typeof StaffFormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
	args: {
		mode: 'create',
	},
};

export const Edit: Story = {
	args: {
		mode: 'edit',
		staff,
	},
};
