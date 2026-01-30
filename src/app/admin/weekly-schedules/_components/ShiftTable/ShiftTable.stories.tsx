import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShiftTable, type ShiftDisplayRow } from './ShiftTable';

const meta = {
	title: 'Admin/WeeklySchedules/ShiftTable',
	component: ShiftTable,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ShiftTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const createShift = (
	id: string,
	dayOffset: number,
	overrides: Partial<ShiftDisplayRow> = {},
): ShiftDisplayRow => {
	const baseDate = new Date('2026-01-19');
	const date = new Date(baseDate);
	date.setDate(baseDate.getDate() + dayOffset);

	return {
		id,
		date,
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientName: '田中太郎',
		serviceTypeId: 'physical-care',
		staffId: 'staff-1',
		staffName: '山田花子',
		status: 'scheduled',
		isUnassigned: false,
		...overrides,
	};
};

const sampleShifts: ShiftDisplayRow[] = [
	createShift('1', 0, {
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
	}),
	createShift('2', 0, {
		startTime: { hour: 11, minute: 0 },
		endTime: { hour: 12, minute: 0 },
		clientName: '鈴木一郎',
		serviceTypeId: 'life-support',
		staffName: null,
		isUnassigned: true,
	}),
	createShift('3', 1, {
		startTime: { hour: 10, minute: 0 },
		endTime: { hour: 11, minute: 30 },
		clientName: '佐藤花子',
		serviceTypeId: 'commute-support',
		staffName: '高橋次郎',
		status: 'confirmed',
	}),
	createShift('4', 2, {
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 0 },
		clientName: '渡辺美咲',
		status: 'completed',
	}),
	createShift('5', 3, {
		startTime: { hour: 9, minute: 30 },
		endTime: { hour: 10, minute: 30 },
		clientName: '伊藤健太',
		status: 'canceled',
	}),
];

export const Default: Story = {
	args: {
		shifts: sampleShifts,
	},
};

export const Empty: Story = {
	args: {
		shifts: [],
	},
};

export const Loading: Story = {
	args: {
		shifts: [],
		loading: true,
	},
};

export const WithUnassigned: Story = {
	args: {
		shifts: [
			createShift('1', 0, { staffName: null, isUnassigned: true }),
			createShift('2', 0, {
				startTime: { hour: 11, minute: 0 },
				endTime: { hour: 12, minute: 0 },
				staffName: null,
				isUnassigned: true,
			}),
			createShift('3', 1, { staffName: '山田花子' }),
		],
	},
};
