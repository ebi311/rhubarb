import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { BasicScheduleFormInitialValues } from './BasicScheduleForm';
import { BasicScheduleForm } from './BasicScheduleForm';

const serviceUsers: ServiceUser[] = [
	{
		id: '019b8b17-5b02-74ed-a77e-724d384629aa',
		office_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
		name: '田中さくら',
		address: '東京都千代田区',
		contract_status: 'active',
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
	{
		id: '019b8b17-5b02-74ed-a77e-724d384629ab',
		office_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
		name: '佐藤太郎',
		address: '東京都港区',
		contract_status: 'active',
		created_at: new Date('2025-01-02T00:00:00Z'),
		updated_at: new Date('2025-01-02T00:00:00Z'),
	},
];

const serviceTypes: ServiceTypeOption[] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
	{ id: 'commute-support', name: '通院介助' },
];

const staffs: StaffRecord[] = [
	{
		id: '019b8b17-5b02-74ed-a77e-724d384629ac',
		office_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
		auth_user_id: null,
		name: '山田太郎',
		role: 'admin',
		email: 'yamada@example.com',
		note: '夜間対応可',
		service_type_ids: ['physical-care', 'life-support'],
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
	{
		id: '019b8b17-5b02-74ed-a77e-724d384629ad',
		office_id: '019b8b17-b254-7296-a008-cab6ca77f3a2',
		auth_user_id: null,
		name: '木村花',
		role: 'helper',
		email: 'kimura@example.com',
		note: null,
		service_type_ids: ['life-support', 'commute-support'],
		created_at: new Date('2025-01-03T00:00:00Z'),
		updated_at: new Date('2025-01-03T00:00:00Z'),
	},
];

const meta = {
	title: 'Admin/BasicSchedules/BasicScheduleForm',
	component: BasicScheduleForm,
	args: {
		serviceUsers,
		serviceTypes,
		staffs,
	},
	parameters: {
		layout: 'fullscreen',
	},
} satisfies Meta<typeof BasicScheduleForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const selectedDefaults: BasicScheduleFormInitialValues = {
	clientId: serviceUsers[0]?.id,
	serviceTypeId: 'physical-care',
	weekday: 'Fri',
	startTime: '09:00',
	endTime: '11:00',
	note: '既存の初期値が入った例です。',
	staffId: staffs[0]?.id,
};

export const WithPreselectedStaff: Story = {
	args: {
		initialValues: selectedDefaults,
	},
};

export const NoAssignments: Story = {
	args: {},
};

const editModeDefaults: BasicScheduleFormInitialValues = {
	clientId: serviceUsers[0]?.id,
	serviceTypeId: 'physical-care',
	weekday: 'Mon',
	startTime: '10:00',
	endTime: '12:00',
	note: '週次定期訪問',
	staffId: staffs[0]?.id,
};

export const EditMode: Story = {
	args: {
		initialValues: editModeDefaults,
		mode: 'edit',
		scheduleId: '019b8b17-5b02-74ed-a77e-724d384629ef',
	},
};

export const EditModeWithoutStaff: Story = {
	args: {
		initialValues: {
			...editModeDefaults,
			staffId: null,
		},
		mode: 'edit',
		scheduleId: '019b8b17-5b02-74ed-a77e-724d384629ef',
	},
};
