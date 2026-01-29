import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import { BasicScheduleList } from './BasicScheduleList';

const sampleSchedules: BasicScheduleViewModel[] = [
	{
		id: 'schedule-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		weekday: 'Mon',
		timeRange: '09:00 - 10:00',
		staffNames: ['田中一郎', '佐藤花子'],
		note: '朝のケア',
	},
	{
		id: 'schedule-2',
		clientName: '鈴木花子',
		serviceTypeId: 'life-support',
		weekday: 'Tue',
		timeRange: '14:00 - 15:30',
		staffNames: [],
		note: null,
	},
];

describe('BasicScheduleList', () => {
	it('スケジュールデータを正しく表示する', () => {
		render(<BasicScheduleList schedules={sampleSchedules} />);

		// データ行の確認
		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('月曜日')).toBeInTheDocument();
		expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
		expect(screen.getByText('田中一郎, 佐藤花子')).toBeInTheDocument();
		expect(screen.getByText('朝のケア')).toBeInTheDocument();

		expect(screen.getByText('鈴木花子')).toBeInTheDocument();
		expect(screen.getByText('火曜日')).toBeInTheDocument();
	});

	it('データがない場合は空状態を表示する', () => {
		render(<BasicScheduleList schedules={[]} />);

		expect(
			screen.getByText('スケジュールが登録されていません'),
		).toBeInTheDocument();
	});

	it('担当者が未設定の場合はハイフンを表示する', () => {
		render(<BasicScheduleList schedules={[sampleSchedules[1]]} />);

		// 担当者は "(未設定)" を表示
		expect(screen.getByText('(未設定)')).toBeInTheDocument();
		// 備考はハイフン
		expect(screen.getByText('-')).toBeInTheDocument();
	});

	it('複数のスケジュールを表示できる', () => {
		render(<BasicScheduleList schedules={sampleSchedules} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('鈴木花子')).toBeInTheDocument();
	});
});
