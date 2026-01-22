import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
	isUnassigned: false,
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
		// キャンセルはバッジとボタンの両方にあるため、badge クラスを持つものを確認
		const cancelBadges = screen.getAllByText('キャンセル');
		expect(cancelBadges.some((el) => el.classList.contains('badge'))).toBe(
			true,
		);
	});

	it('loading が true の場合はローディング表示される', () => {
		render(<ShiftTable shifts={[]} loading />);

		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it('シフトが空の場合は空状態メッセージが表示される', () => {
		render(<ShiftTable shifts={[]} />);

		expect(screen.getByText(/シフトがありません/)).toBeInTheDocument();
	});

	it('操作列のヘッダーが表示される', () => {
		const shifts = [createShift()];
		render(<ShiftTable shifts={shifts} />);

		expect(
			screen.getByRole('columnheader', { name: /操作/ }),
		).toBeInTheDocument();
	});

	it('scheduledステータスの行に担当者変更アイコンとキャンセルボタンが表示される', () => {
		const shifts = [createShift({ status: 'scheduled', isUnassigned: false })];
		render(<ShiftTable shifts={shifts} />);

		expect(
			screen.getByRole('button', { name: '担当者を変更' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
	});

	it('未割当の行に担当者割り当てアイコンとキャンセルボタンが表示される', () => {
		const shifts = [
			createShift({ status: 'scheduled', isUnassigned: true, staffName: null }),
		];
		render(<ShiftTable shifts={shifts} />);

		expect(
			screen.getByRole('button', { name: '担当者を割り当て' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
	});

	it('担当者変更アイコンクリック時にonChangeStaffが呼ばれる', async () => {
		const user = userEvent.setup();
		const onChangeStaff = vi.fn();
		const shift = createShift({ status: 'scheduled', isUnassigned: false });
		render(<ShiftTable shifts={[shift]} onChangeStaff={onChangeStaff} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));

		expect(onChangeStaff).toHaveBeenCalledWith(shift);
	});

	it('キャンセルボタンクリック時にonCancelShiftが呼ばれる', async () => {
		const user = userEvent.setup();
		const onCancelShift = vi.fn();
		const shift = createShift({ status: 'scheduled' });
		render(<ShiftTable shifts={[shift]} onCancelShift={onCancelShift} />);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(onCancelShift).toHaveBeenCalledWith(shift);
	});

	it('担当者割り当てアイコンクリック時にonAssignStaffが呼ばれる', async () => {
		const user = userEvent.setup();
		const onAssignStaff = vi.fn();
		const shift = createShift({
			status: 'scheduled',
			isUnassigned: true,
			staffName: null,
		});
		render(<ShiftTable shifts={[shift]} onAssignStaff={onAssignStaff} />);

		await user.click(screen.getByRole('button', { name: '担当者を割り当て' }));

		expect(onAssignStaff).toHaveBeenCalledWith(shift);
	});
});
