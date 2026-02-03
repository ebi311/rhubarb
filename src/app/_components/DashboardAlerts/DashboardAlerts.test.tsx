import type { AlertItem } from '@/models/dashboardActionSchemas';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardAlerts } from './DashboardAlerts';

const mockAlerts: AlertItem[] = [
	{
		id: 'alert-1',
		type: 'unassigned',
		date: new Date('2026-02-03'),
		startTime: { hour: 11, minute: 0 },
		clientName: '佐藤花子',
		message: '担当者が未割当です',
	},
	{
		id: 'alert-2',
		type: 'unassigned',
		date: new Date('2026-02-04'),
		startTime: { hour: 14, minute: 30 },
		clientName: '田中一郎',
		message: '担当者が未割当です',
	},
];

type Props = React.ComponentProps<typeof DashboardAlerts>;

const renderComponent = (props: Partial<Props> = {}) => {
	return render(<DashboardAlerts alerts={mockAlerts} {...props} />);
};

describe('DashboardAlerts', () => {
	describe('アラート表示', () => {
		it('セクションタイトルが表示される', () => {
			renderComponent();
			expect(screen.getByText('注意が必要な予定')).toBeInTheDocument();
		});

		it('アラートメッセージが表示される', () => {
			renderComponent();
			const messages = screen.getAllByText('担当者が未割当です');
			expect(messages).toHaveLength(2);
		});

		it('クライアント名と時刻が表示される', () => {
			renderComponent();
			expect(screen.getByText('佐藤花子 - 11:00')).toBeInTheDocument();
			expect(screen.getByText('田中一郎 - 14:30')).toBeInTheDocument();
		});

		it('警告スタイルのアラートが表示される', () => {
			renderComponent();
			const alerts = screen.getAllByRole('alert');
			expect(alerts[0]).toHaveClass('alert-warning');
		});
	});

	describe('空の状態', () => {
		it('アラートがない場合、何も表示されない', () => {
			renderComponent({ alerts: [] });
			expect(screen.queryByText('注意が必要な予定')).not.toBeInTheDocument();
		});
	});

	describe('Iconコンポーネント使用', () => {
		it('警告アイコンが表示される', () => {
			renderComponent();
			expect(screen.getAllByText('warning')).toHaveLength(2);
		});
	});
});
