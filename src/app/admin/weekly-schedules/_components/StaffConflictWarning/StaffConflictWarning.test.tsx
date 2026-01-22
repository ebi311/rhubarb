import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaffConflictWarning } from './StaffConflictWarning';

describe('StaffConflictWarning', () => {
	const conflictingShifts = [
		{
			id: '12345678-1234-1234-8234-123456789abc',
			clientName: '田中太郎',
			startTime: new Date('2026-01-22T09:00:00+09:00'),
			endTime: new Date('2026-01-22T12:00:00+09:00'),
		},
		{
			id: '12345678-1234-1234-8234-123456789def',
			clientName: '鈴木花子',
			startTime: new Date('2026-01-22T14:00:00+09:00'),
			endTime: new Date('2026-01-22T17:00:00+09:00'),
		},
	];

	it('警告メッセージが表示される', () => {
		render(<StaffConflictWarning conflictingShifts={conflictingShifts} />);

		expect(
			screen.getByText(/このスタッフは既に以下のシフトに割り当てられています/),
		).toBeInTheDocument();
	});

	it('重複シフトの一覧が表示される', () => {
		render(<StaffConflictWarning conflictingShifts={conflictingShifts} />);

		expect(screen.getByText('田中太郎')).toBeInTheDocument();
		expect(screen.getByText(/09:00.*12:00/)).toBeInTheDocument();
		expect(screen.getByText('鈴木花子')).toBeInTheDocument();
		expect(screen.getByText(/14:00.*17:00/)).toBeInTheDocument();
	});

	it('重複シフトの件数が表示される', () => {
		render(<StaffConflictWarning conflictingShifts={conflictingShifts} />);

		expect(screen.getByText(/2件/)).toBeInTheDocument();
	});
});
