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

	it('スケジュールセルに時間帯とスタッフ名が表示される', () => {
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
					],
				},
			},
		];

		render(<BasicScheduleGrid schedules={schedules} />);

		expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
		expect(screen.getByText('スタッフA')).toBeInTheDocument();
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

		expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
		expect(screen.getByText('スタッフA')).toBeInTheDocument();
		expect(screen.getByText('14:00-15:00')).toBeInTheDocument();
		expect(screen.getByText('スタッフB')).toBeInTheDocument();
	});

	it('スケジュールが0件の場合、メッセージが表示される', () => {
		render(<BasicScheduleGrid schedules={[]} />);

		expect(
			screen.getByText('条件に一致する基本スケジュールがありません'),
		).toBeInTheDocument();
	});
});
