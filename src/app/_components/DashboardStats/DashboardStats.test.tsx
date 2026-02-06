import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardStats } from './DashboardStats';

type Props = React.ComponentProps<typeof DashboardStats>;

const defaultProps: Props = {
	todayShiftCount: 5,
	weekShiftCount: 20,
	unassignedCount: 3,
};

const renderComponent = (props: Partial<Props> = {}) => {
	return render(<DashboardStats {...defaultProps} {...props} />);
};

describe('DashboardStats', () => {
	describe('統計カードの表示', () => {
		it('今日の予定数を表示する', () => {
			renderComponent({ todayShiftCount: 5 });
			expect(screen.getByText('今日の予定')).toBeInTheDocument();
			expect(screen.getByText('5')).toBeInTheDocument();
		});

		it('今週の予定数を表示する', () => {
			renderComponent({ weekShiftCount: 20 });
			expect(screen.getByText('今週の予定')).toBeInTheDocument();
			expect(screen.getByText('20')).toBeInTheDocument();
		});

		it('未割当の予定数を表示する', () => {
			renderComponent({ unassignedCount: 3 });
			expect(screen.getByText('未割当')).toBeInTheDocument();
			expect(screen.getByText('3')).toBeInTheDocument();
		});
	});

	describe('未割当のアラート表示', () => {
		it('未割当が0件の場合、警告スタイルが適用されない', () => {
			renderComponent({ unassignedCount: 0 });
			const statValue = screen.getByText('0');
			expect(statValue).not.toHaveClass('text-warning');
		});

		it('未割当が1件以上の場合、警告スタイルが適用される', () => {
			renderComponent({ unassignedCount: 3 });
			const statValue = screen.getByText('3');
			expect(statValue).toHaveClass('text-warning');
		});
	});
});
