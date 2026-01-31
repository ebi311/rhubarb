import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BasicScheduleGrid } from './BasicScheduleGrid';
import type { BasicScheduleGridViewModel } from './types';

describe('BasicScheduleGrid', () => {
	it('ヘッダー行に利用者名と曜日が表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('利用者名')).toBeInTheDocument();
		expect(screen.getByText('月曜日')).toBeInTheDocument();
		expect(screen.getByText('火曜日')).toBeInTheDocument();
		expect(screen.getByText('水曜日')).toBeInTheDocument();
		expect(screen.getByText('木曜日')).toBeInTheDocument();
		expect(screen.getByText('金曜日')).toBeInTheDocument();
		expect(screen.getByText('土曜日')).toBeInTheDocument();
		expect(screen.getByText('日曜日')).toBeInTheDocument();
	});

	it('利用者名が表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {},
			},
			{
				clientId: '2',
				clientName: '佐藤花子',
				schedulesByWeekday: {},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('スケジュールセルに時間帯とスタッフ名が表示される。スタッフがいない場合は "(未設定)" が表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00-10:00',
							serviceTypeId: 'physical-care',
							staffNames: ['スタッフA'],
							note: null,
						},
						{
							id: '2',
							timeRange: '13:00-14:00',
							serviceTypeId: 'life-support',
							staffNames: [],
							note: null,
						},
					],
				},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
		expect(screen.getByText('スタッフA')).toBeInTheDocument();
		expect(screen.getByText('13:00-14:00')).toBeInTheDocument();
		expect(screen.getByText('(未設定)')).toBeInTheDocument();
	});

	it('スケジュールセルがリンクになっている', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: 'schedule-123',
							timeRange: '09:00-10:00',
							serviceTypeId: 'physical-care',
							staffNames: ['スタッフA'],
							note: null,
						},
					],
				},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		const link = screen.getByRole('link', {
			name: /09:00-10:00 担当: スタッフA/,
		});
		expect(link).toHaveAttribute(
			'href',
			'/admin/basic-schedules/schedule-123/edit',
		);
	});

	it('1つのセルに複数のスケジュールがある場合、全て表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00-10:00',
							serviceTypeId: 'physical-care',
							staffNames: ['スタッフA'],
							note: null,
						},
						{
							id: '2',
							timeRange: '14:00-15:00',
							serviceTypeId: 'life-support',
							staffNames: ['スタッフB'],
							note: null,
						},
					],
				},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		const cell1 = screen.getByTestId('basic-schedule-cell-1');
		expect(cell1).toBeInTheDocument();
		expect(cell1).toHaveTextContent('09:00-10:00');
		expect(cell1).toHaveTextContent('スタッフA');

		const cell2 = screen.getByTestId('basic-schedule-cell-2');
		expect(cell2).toBeInTheDocument();
		expect(cell2).toHaveTextContent('14:00-15:00');
		expect(cell2).toHaveTextContent('スタッフB');
	});

	it('スケジュールが0件の場合、メッセージが表示される', () => {
		render(<BasicScheduleGrid schedules={[]} />);

		expect(
			screen.getByText('条件に一致する基本スケジュールがありません'),
		).toBeInTheDocument();
	});
});
