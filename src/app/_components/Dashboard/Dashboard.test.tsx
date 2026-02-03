import type { DashboardData } from '@/models/dashboardActionSchemas';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dashboard } from './Dashboard';

const defaultData: DashboardData = {
	stats: {
		todayShiftCount: 5,
		weekShiftCount: 20,
		unassignedCount: 2,
	},
	timeline: [
		{
			id: 'shift-1',
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
			clientName: '山田太郎',
			staffName: '田中一郎',
			isUnassigned: false,
			serviceTypeName: '生活支援',
		},
		{
			id: 'shift-2',
			startTime: { hour: 11, minute: 0 },
			endTime: { hour: 12, minute: 30 },
			clientName: '佐藤花子',
			staffName: null,
			isUnassigned: true,
			serviceTypeName: '身体介護',
		},
	],
	alerts: [
		{
			id: 'alert-1',
			type: 'unassigned',
			date: new Date('2026-02-03'),
			startTime: { hour: 11, minute: 0 },
			clientName: '佐藤花子',
			message: '担当者が未割当です',
		},
	],
};

type Props = React.ComponentProps<typeof Dashboard>;

const renderComponent = (props: Partial<Props> = {}) => {
	return render(<Dashboard data={defaultData} {...props} />);
};

describe('Dashboard', () => {
	describe('統計カードセクション', () => {
		it('DashboardStatsコンポーネントが表示される', () => {
			renderComponent();
			expect(screen.getByText('今日の予定')).toBeInTheDocument();
			expect(screen.getByText('5')).toBeInTheDocument();
		});
	});

	describe('今日のタイムラインセクション', () => {
		it('タイムラインのヘッダーが表示される', () => {
			renderComponent();
			expect(screen.getByText('今日のスケジュール')).toBeInTheDocument();
		});

		it('タイムラインアイテムが表示される', () => {
			renderComponent();
			expect(screen.getByText('山田太郎')).toBeInTheDocument();
			expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
			expect(screen.getByText('田中一郎')).toBeInTheDocument();
		});

		it('未割当のタイムラインアイテムが警告スタイルで表示される', () => {
			renderComponent();
			expect(screen.getByText('佐藤花子')).toBeInTheDocument();
			// タイムライン内のバッジを確認
			const unassignedBadge = screen.getByText('未割当', {
				selector: '.badge',
			});
			expect(unassignedBadge).toHaveClass('badge-warning');
		});

		it('タイムラインが空の場合、メッセージが表示される', () => {
			renderComponent({
				data: { ...defaultData, timeline: [] },
			});
			expect(screen.getByText('今日の予定はありません')).toBeInTheDocument();
		});
	});

	describe('アラートセクション', () => {
		it('アラートが表示される', () => {
			renderComponent();
			expect(screen.getByText('担当者が未割当です')).toBeInTheDocument();
		});

		it('アラートがない場合、セクションが表示されない', () => {
			renderComponent({
				data: { ...defaultData, alerts: [] },
			});
			expect(screen.queryByText('注意が必要な予定')).not.toBeInTheDocument();
		});
	});

	describe('クイックアクセスセクション', () => {
		it('クイックアクセスセクションが表示される', () => {
			renderComponent();
			expect(screen.getByText('クイックアクセス')).toBeInTheDocument();
		});

		it('基本スケジュールへのリンクが表示される', () => {
			renderComponent();
			const link = screen.getByRole('link', { name: /基本スケジュール/ });
			expect(link).toHaveAttribute('href', '/admin/basic-schedules');
		});

		it('週次スケジュールへのリンクが表示される', () => {
			renderComponent();
			const link = screen.getByRole('link', { name: /週次スケジュール/ });
			expect(link).toHaveAttribute('href', '/admin/weekly-schedules');
		});
	});

	describe('レスポンシブ対応', () => {
		it('ダッシュボードコンテナが存在する', () => {
			renderComponent();
			const container = screen.getByTestId('dashboard-container');
			expect(container).toBeInTheDocument();
		});
	});
});
