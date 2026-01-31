import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaffBasicScheduleGrid } from './StaffBasicScheduleGrid';
import type { StaffBasicScheduleGridViewModel } from './types';

describe('StaffBasicScheduleGrid', () => {
	it('should render empty state when no schedules', () => {
		render(<StaffBasicScheduleGrid schedules={[]} />);
		expect(
			screen.getByText('条件に一致する基本スケジュールがありません'),
		).toBeInTheDocument();
	});

	it('should render staff names and weekday headers', () => {
		const schedules: StaffBasicScheduleGridViewModel[] = [
			{
				staffId: '1',
				staffName: 'スタッフ太郎',
				schedulesByWeekday: {},
			},
		];

		render(<StaffBasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('スタッフ名')).toBeInTheDocument();
		expect(screen.getByText('スタッフ太郎')).toBeInTheDocument();
		expect(screen.getByText('月曜日')).toBeInTheDocument();
		expect(screen.getByText('火曜日')).toBeInTheDocument();
	});

	it('should render schedule cells with time and client name', () => {
		const schedules: StaffBasicScheduleGridViewModel[] = [
			{
				staffId: '1',
				staffName: 'スタッフ太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '利用者A',
							note: null,
						},
					],
				},
			},
		];

		render(<StaffBasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
		expect(screen.getByText('利用者A')).toBeInTheDocument();
	});

	it('should highlight unassigned schedules', () => {
		const schedules: StaffBasicScheduleGridViewModel[] = [
			{
				staffId: null,
				staffName: '未割り当て',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '利用者A',
							note: null,
						},
					],
				},
			},
		];

		render(<StaffBasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('未割り当て')).toBeInTheDocument();
		expect(screen.getByText('利用者A')).toBeInTheDocument();
	});

	it('should render multiple schedules in same cell', () => {
		const schedules: StaffBasicScheduleGridViewModel[] = [
			{
				staffId: '1',
				staffName: 'スタッフ太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '利用者A',
							note: null,
						},
						{
							id: '2',
							timeRange: '13:00 - 15:00',
							serviceTypeId: 'life-support',
							clientName: '利用者B',
							note: null,
						},
					],
				},
			},
		];

		render(<StaffBasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
		expect(screen.getByText('13:00 - 15:00')).toBeInTheDocument();
		expect(screen.getByText('利用者A')).toBeInTheDocument();
		expect(screen.getByText('利用者B')).toBeInTheDocument();
	});
});
