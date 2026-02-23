import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShiftInfoCard } from './ShiftInfoCard';

const mockShift = {
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00Z'),
	endTime: new Date('2024-01-15T10:00:00Z'),
	currentStaffName: '佐藤花子',
};

describe('ShiftInfoCard', () => {
	it('シフト情報のヘッダーが表示される', () => {
		render(<ShiftInfoCard shift={mockShift} />);

		expect(screen.getByText('シフト情報')).toBeInTheDocument();
	});

	it('利用者名が表示される', () => {
		render(<ShiftInfoCard shift={mockShift} />);

		expect(screen.getByText('利用者')).toBeInTheDocument();
		expect(screen.getByText('山田太郎')).toBeInTheDocument();
	});

	it('サービス種別が表示される', () => {
		render(<ShiftInfoCard shift={mockShift} />);

		expect(screen.getByText('サービス')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
	});

	it('日時が表示される', () => {
		render(<ShiftInfoCard shift={mockShift} />);

		expect(screen.getByText('日時')).toBeInTheDocument();
		// 日付と時間のフォーマットを確認（JST変換されるため18:00, 19:00になる）
		expect(screen.getByText(/2024年1月15日/)).toBeInTheDocument();
		expect(screen.getByText(/18:00/)).toBeInTheDocument();
		expect(screen.getByText(/19:00/)).toBeInTheDocument();
	});

	it('現在の担当者が表示される', () => {
		render(<ShiftInfoCard shift={mockShift} />);

		expect(screen.getByText('現在の担当者')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('担当者ラベルをカスタマイズできる', () => {
		render(<ShiftInfoCard shift={mockShift} staffLabel="担当スタッフ" />);

		expect(screen.getByText('担当スタッフ')).toBeInTheDocument();
		expect(screen.queryByText('現在の担当者')).not.toBeInTheDocument();
	});
});
