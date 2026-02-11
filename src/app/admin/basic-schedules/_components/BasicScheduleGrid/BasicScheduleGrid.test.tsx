import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { BasicScheduleGrid } from './BasicScheduleGrid';
import type { BasicScheduleGridViewModel } from './types';

const serviceTypeOptions: ComponentProps<
	typeof BasicScheduleGrid
>['serviceTypeOptions'] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
];

const staffOptions: ComponentProps<typeof BasicScheduleGrid>['staffOptions'] = [
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

describe('BasicScheduleGrid', () => {
	it('ヘッダー行に利用者名と曜日が表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {},
			},
		];

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

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

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

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

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

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

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

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

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

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
		render(
			<BasicScheduleGrid
				schedules={[]}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		expect(
			screen.getByText('条件に一致する基本スケジュールがありません'),
		).toBeInTheDocument();
	});
});

describe('add schedule button', () => {
	it('各曜日セルに「シフト追加」ボタンが存在し、group-hover で表示される', () => {
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: '1',
				clientName: '山田太郎',
				schedulesByWeekday: {},
			},
		];

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		// 7曜日分のシフト追加ボタンが存在する
		const addButtons = screen.getAllByRole('button', {
			name: 'シフト追加',
		});
		expect(addButtons).toHaveLength(7);

		// ボタンは invisible クラスで非表示だが、group-hover:visible で表示される設定を持つ
		for (const button of addButtons) {
			expect(button.className).toContain('invisible');
			expect(button.className).toContain('group-hover:visible');
		}
	});

	it('シフト追加ボタンをクリックすると「予定を追加」ダイアログが表示される', async () => {
		const user = userEvent.setup();
		const schedules: BasicScheduleGridViewModel[] = [
			{
				clientId: 'client-1',
				clientName: '山田太郎',
				schedulesByWeekday: {},
			},
		];

		render(
			<BasicScheduleGrid
				schedules={schedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
			/>,
		);

		// ダイアログが表示されていないことを確認
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		// 最初のシフト追加ボタン（月曜日）をクリック
		const addButtons = screen.getAllByRole('button', {
			name: 'シフト追加',
		});
		await user.click(addButtons[0]);

		// ダイアログが表示される
		const dialog = screen.getByRole('dialog');
		expect(dialog).toBeInTheDocument();
		expect(screen.getByText('予定を追加')).toBeInTheDocument();

		// サービス種別の選択肢が表示されている
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('生活援助')).toBeInTheDocument();

		// 担当者ボタンが「未選択」で表示されている
		expect(screen.getByText('未選択')).toBeInTheDocument();
	});
});
