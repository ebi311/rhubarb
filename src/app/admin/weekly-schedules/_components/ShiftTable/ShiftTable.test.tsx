import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShiftTable, type ShiftDisplayRow } from './ShiftTable';

const createShift = (
	overrides: Partial<ShiftDisplayRow> = {},
): ShiftDisplayRow => ({
	id: 'shift-1',
	date: new Date('2026-01-19'),
	startTime: { hour: 9, minute: 0 },
	endTime: { hour: 10, minute: 0 },
	clientName: '田中太郎',
	serviceTypeId: 'physical-care',
	staffName: '山田花子',
	status: 'scheduled',
	...overrides,
});

describe('ShiftTable', () => {
	it('テーブルヘッダーが表示される', () => {
		const shifts = [createShift()];
		render(<ShiftTable shifts={shifts} />);

		expect(
			screen.getByRole('columnheader', { name: /日付/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /時間/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /利用者/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /サービス区分/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /担当者/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /ステータス/ }),
		).toBeInTheDocument();
	});

	it('シフトデータが表示される', () => {
		const shifts = [
			createShift({
				date: new Date('2026-01-19'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 30 },
				clientName: '田中太郎',
				serviceTypeId: 'physical-care',
				staffName: '山田花子',
			}),
		];

		render(<ShiftTable shifts={shifts} />);

		expect(screen.getByText('2026/01/19(月)')).toBeInTheDocument();
		expect(screen.getByText('09:00 - 10:30')).toBeInTheDocument();
		expect(screen.getByText('田中太郎')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('山田花子')).toBeInTheDocument();
	});

	it('未割当の場合は「未割当」バッジが表示される', () => {
		const shifts = [createShift({ staffName: null })];

		render(<ShiftTable shifts={shifts} />);

		const badge = screen.getByText('未割当');
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass('badge-warning');
	});

	it('ステータスに応じたバッジが表示される', () => {
		const shifts = [
			createShift({ id: '1', status: 'scheduled' }),
			createShift({ id: '2', status: 'confirmed' }),
			createShift({ id: '3', status: 'completed' }),
			createShift({ id: '4', status: 'canceled' }),
		];

		render(<ShiftTable shifts={shifts} />);

		expect(screen.getByText('予定')).toBeInTheDocument();
		expect(screen.getByText('確定')).toBeInTheDocument();
		expect(screen.getByText('完了')).toBeInTheDocument();
		expect(screen.getByText('キャンセル')).toBeInTheDocument();
	});

	it('loading が true の場合はローディング表示される', () => {
		render(<ShiftTable shifts={[]} loading />);

		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it('シフトが空の場合は空状態メッセージが表示される', () => {
		render(<ShiftTable shifts={[]} />);

		expect(screen.getByText(/シフトがありません/)).toBeInTheDocument();
	});
});
