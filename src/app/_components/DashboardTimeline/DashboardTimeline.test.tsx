import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardTimeline } from './DashboardTimeline';

const mockTimeline: TodayTimelineItem[] = [
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
];

type Props = React.ComponentProps<typeof DashboardTimeline>;

const renderComponent = (props: Partial<Props> = {}) => {
	return render(<DashboardTimeline timeline={mockTimeline} {...props} />);
};

describe('DashboardTimeline', () => {
	describe('ヘッダー表示', () => {
		it('タイムラインのヘッダーが表示される', () => {
			renderComponent();
			expect(screen.getByText('今日のスケジュール')).toBeInTheDocument();
		});
	});

	describe('タイムラインアイテム表示', () => {
		it('タイムラインアイテムが表示される', () => {
			renderComponent();
			expect(screen.getByText('山田太郎')).toBeInTheDocument();
			expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
			expect(screen.getByText('田中一郎')).toBeInTheDocument();
		});

		it('未割当のタイムラインアイテムが警告スタイルで表示される', () => {
			renderComponent();
			expect(screen.getByText('佐藤花子')).toBeInTheDocument();
			const unassignedBadge = screen.getByText('未割当', {
				selector: '.badge',
			});
			expect(unassignedBadge).toHaveClass('badge-warning');
		});

		it('サービス種別名が表示される', () => {
			renderComponent();
			expect(screen.getByText('生活支援')).toBeInTheDocument();
			expect(screen.getByText('身体介護')).toBeInTheDocument();
		});
	});

	describe('空の状態', () => {
		it('タイムラインが空の場合、メッセージが表示される', () => {
			renderComponent({ timeline: [] });
			expect(screen.getByText('今日の予定はありません')).toBeInTheDocument();
		});
	});
});
