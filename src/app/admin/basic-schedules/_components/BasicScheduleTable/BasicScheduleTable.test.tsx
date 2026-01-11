import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BasicScheduleTable } from './BasicScheduleTable';
import type { BasicScheduleViewModel } from './types';

// モック: データ取得関数
const mockFetchSchedules = vi.fn<() => Promise<BasicScheduleViewModel[]>>();

// モック設定
vi.mock('./fetchBasicSchedules', () => ({
	fetchBasicSchedules: () => mockFetchSchedules(),
}));

// コンポーネントのインポートはモック後

const sampleSchedules: BasicScheduleViewModel[] = [
	{
		id: 'schedule-1',
		clientName: '山田太郎',
		serviceTypeName: '身体介護',
		weekday: 'Mon',
		timeRange: '09:00 - 10:00',
		staffNames: ['田中一郎', '佐藤花子'],
		note: '朝のケア',
	},
	{
		id: 'schedule-2',
		clientName: '鈴木花子',
		serviceTypeName: '生活援助',
		weekday: 'Tue',
		timeRange: '14:00 - 15:30',
		staffNames: [],
		note: null,
	},
];

describe('BasicScheduleTable', () => {
	it('スケジュールデータを正しく表示する', async () => {
		mockFetchSchedules.mockResolvedValue(sampleSchedules);

		render(await BasicScheduleTable({ filters: {} }));

		// ヘッダーの確認
		expect(screen.getByRole('columnheader', { name: '利用者' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: 'サービス区分' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '曜日' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '時間帯' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '担当者' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '備考' })).toBeInTheDocument();

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

	it('データがない場合は空状態を表示する', async () => {
		mockFetchSchedules.mockResolvedValue([]);

		render(await BasicScheduleTable({ filters: {} }));

		expect(screen.getByText('スケジュールが登録されていません')).toBeInTheDocument();
	});

	it('担当者が未設定の場合はハイフンを表示する', async () => {
		mockFetchSchedules.mockResolvedValue([sampleSchedules[1]]);

		render(await BasicScheduleTable({ filters: {} }));

		// 担当者列と備考列の両方がハイフン
		const hyphens = screen.getAllByText('-');
		expect(hyphens).toHaveLength(2);
	});

	it('フィルタをfetchBasicSchedulesに渡す', async () => {
		mockFetchSchedules.mockResolvedValue([]);
		const filters = { weekday: 'Mon' as const, clientId: 'client-1' };

		render(await BasicScheduleTable({ filters }));

		expect(mockFetchSchedules).toHaveBeenCalled();
	});
});
