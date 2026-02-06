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
			expect(screen.getByText('佐藤花子')).toBeInTheDocument();
			expect(screen.getByText('田中一郎')).toBeInTheDocument();
			expect(screen.getByText('11:00')).toBeInTheDocument();
			expect(screen.getByText('14:30')).toBeInTheDocument();
		});

		it('日付がM/D形式で表示される', () => {
			renderComponent();
			expect(screen.getByText('2/3')).toBeInTheDocument();
			expect(screen.getByText('2/4')).toBeInTheDocument();
		});

		it('警告スタイルのアラートが表示される', () => {
			renderComponent();
			const links = screen.getAllByRole('link');
			expect(links[0]).toHaveClass('alert-warning');
		});
	});

	describe('週次スケジュールへのリンク', () => {
		it('週次スケジュール画面へのリンクが設定される', () => {
			renderComponent();
			const links = screen.getAllByRole('link');
			// 2026-02-03 は火曜日なので、週の月曜日は 2026-02-02
			expect(links[0]).toHaveAttribute(
				'href',
				'/admin/weekly-schedules?week=2026-02-02',
			);
			// 2026-02-04 は水曜日なので、週の月曜日は 2026-02-02
			expect(links[1]).toHaveAttribute(
				'href',
				'/admin/weekly-schedules?week=2026-02-02',
			);
		});

		it('aria-labelが設定される', () => {
			renderComponent();
			const links = screen.getAllByRole('link');
			expect(links[0]).toHaveAttribute(
				'aria-label',
				'2/3 佐藤花子 11:00 の週次スケジュールを表示',
			);
			expect(links[1]).toHaveAttribute(
				'aria-label',
				'2/4 田中一郎 14:30 の週次スケジュールを表示',
			);
		});
	});

	describe('日曜日のエッジケース', () => {
		it('日曜日の場合、前週の月曜日にリンクする', () => {
			const sundayAlert: AlertItem[] = [
				{
					id: 'alert-sunday',
					type: 'unassigned',
					date: new Date('2026-02-08'), // 日曜日
					startTime: { hour: 9, minute: 0 },
					clientName: 'テスト太郎',
					message: 'テスト',
				},
			];
			render(<DashboardAlerts alerts={sundayAlert} />);
			const link = screen.getByRole('link');
			// 2026-02-08(日)の前週の月曜日は 2026-02-02
			expect(link).toHaveAttribute(
				'href',
				'/admin/weekly-schedules?week=2026-02-02',
			);
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
