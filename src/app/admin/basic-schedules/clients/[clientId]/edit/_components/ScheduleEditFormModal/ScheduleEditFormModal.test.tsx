import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ScheduleData } from '../ClientWeeklyScheduleEditor/types';
import type { StaffPickerOption } from './ScheduleEditFormModal';
import { ScheduleEditFormModal } from './ScheduleEditFormModal';

const staffOptions: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'helper',
		serviceTypeIds: ['life-support', 'physical-care'] as ServiceTypeId[],
	},
	{
		id: 'staff-2',
		name: '佐藤花子',
		role: 'admin',
		serviceTypeIds: ['life-support'] as ServiceTypeId[],
	},
];

// 最小限のprops
const defaultProps = {
	isOpen: true,
	weekday: 'Mon' as const,
	serviceTypeOptions: [
		{ id: 'life-support' as ServiceTypeId, name: '生活支援' },
		{ id: 'physical-care' as ServiceTypeId, name: '身体介護' },
		{ id: 'commute-support' as ServiceTypeId, name: '通院サポート' },
	],
	staffOptions,
	onClose: vi.fn(),
	onSubmit: vi.fn(),
};

describe('ScheduleEditFormModal', () => {
	describe('新規追加モード', () => {
		it('モーダルが開いている時に表示される', () => {
			render(<ScheduleEditFormModal {...defaultProps} />);

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByText('予定を追加')).toBeInTheDocument();
		});

		it('モーダルが閉じている時は表示されない', () => {
			render(<ScheduleEditFormModal {...defaultProps} isOpen={false} />);

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('フォームに必要なフィールドが表示される', () => {
			render(<ScheduleEditFormModal {...defaultProps} />);

			expect(screen.getByLabelText('サービス区分')).toBeInTheDocument();
			expect(screen.getByLabelText('開始時刻')).toBeInTheDocument();
			expect(screen.getByLabelText('終了時刻')).toBeInTheDocument();
			expect(screen.getByLabelText('備考')).toBeInTheDocument();
		});

		it('キャンセルボタンで onClose が呼ばれる', async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<ScheduleEditFormModal {...defaultProps} onClose={onClose} />);

			await user.click(screen.getByRole('button', { name: 'キャンセル' }));

			expect(onClose).toHaveBeenCalled();
		});

		it('Escapeキーで onClose が呼ばれる', async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<ScheduleEditFormModal {...defaultProps} onClose={onClose} />);

			await user.keyboard('{Escape}');

			expect(onClose).toHaveBeenCalled();
		});

		it('有効な入力で反映ボタンを押すと onSubmit が呼ばれる', async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn();

			render(<ScheduleEditFormModal {...defaultProps} onSubmit={onSubmit} />);

			// フォーム入力
			await user.selectOptions(
				screen.getByLabelText('サービス区分'),
				'life-support',
			);
			await user.clear(screen.getByLabelText('開始時刻'));
			await user.type(screen.getByLabelText('開始時刻'), '09:00');
			await user.clear(screen.getByLabelText('終了時刻'));
			await user.type(screen.getByLabelText('終了時刻'), '10:00');

			await user.click(screen.getByRole('button', { name: '反映' }));

			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalledWith(
					expect.objectContaining({
						weekday: 'Mon',
						serviceTypeId: 'life-support',
						startTime: { hour: 9, minute: 0 },
						endTime: { hour: 10, minute: 0 },
					}),
				);
			});
		});

		it('終了時刻が開始時刻より前の場合エラーを表示する', async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn();

			render(<ScheduleEditFormModal {...defaultProps} onSubmit={onSubmit} />);

			await user.selectOptions(
				screen.getByLabelText('サービス区分'),
				'life-support',
			);
			await user.clear(screen.getByLabelText('開始時刻'));
			await user.type(screen.getByLabelText('開始時刻'), '10:00');
			await user.clear(screen.getByLabelText('終了時刻'));
			await user.type(screen.getByLabelText('終了時刻'), '09:00');

			await user.click(screen.getByRole('button', { name: '反映' }));

			await waitFor(() => {
				expect(
					screen.getByText('終了時刻は開始時刻より後に設定してください'),
				).toBeInTheDocument();
			});
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe('編集モード', () => {
		const initialData: ScheduleData = {
			weekday: 'Tue',
			serviceTypeId: 'physical-care',
			staffIds: ['staff-1'],
			staffNames: ['山田太郎'],
			startTime: { hour: 14, minute: 30 },
			endTime: { hour: 16, minute: 0 },
			note: 'テストメモ',
		};

		it('編集モードではタイトルが「予定を編集」になる', () => {
			render(
				<ScheduleEditFormModal {...defaultProps} initialData={initialData} />,
			);

			expect(screen.getByText('予定を編集')).toBeInTheDocument();
		});

		it('初期値がフォームにプリフィルされる', () => {
			render(
				<ScheduleEditFormModal {...defaultProps} initialData={initialData} />,
			);

			expect(screen.getByLabelText('サービス区分')).toHaveValue(
				'physical-care',
			);
			expect(screen.getByLabelText('開始時刻')).toHaveValue('14:30');
			expect(screen.getByLabelText('終了時刻')).toHaveValue('16:00');
			expect(screen.getByLabelText('備考')).toHaveValue('テストメモ');
		});

		it('初期担当者が選択されている', () => {
			render(
				<ScheduleEditFormModal {...defaultProps} initialData={initialData} />,
			);

			// 担当者名が表示されている
			expect(screen.getByText('山田太郎')).toBeInTheDocument();
		});
	});

	describe('担当者選択', () => {
		it('担当者を選択ボタンが表示される', () => {
			render(<ScheduleEditFormModal {...defaultProps} />);

			// 未選択状態のボタンが表示
			expect(screen.getByText('未選択')).toBeInTheDocument();
		});

		it('担当者を選択ボタンをクリックするとダイアログが開く', async () => {
			const user = userEvent.setup();
			render(<ScheduleEditFormModal {...defaultProps} />);

			await user.click(screen.getByText('未選択'));

			// ダイアログが開く（タイトルが表示される）
			expect(screen.getByText('担当者を選択')).toBeInTheDocument();
		});

		it('担当者を選択すると名前がボタンに表示される', async () => {
			const user = userEvent.setup();
			render(<ScheduleEditFormModal {...defaultProps} />);

			await user.click(screen.getByText('未選択'));
			// テーブルから担当者を選択
			await user.click(screen.getByText('山田太郎'));
			// 確定ボタンをクリック
			await user.click(screen.getByRole('button', { name: '確定する' }));

			// ダイアログが閉じ、担当者名が表示される
			await waitFor(() => {
				// 担当者セクションのボタンに名前が表示される
				expect(
					screen.getByRole('button', { name: '山田太郎' }),
				).toBeInTheDocument();
			});
		});

		it('選択した担当者がonSubmitに含まれる', async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn();
			render(<ScheduleEditFormModal {...defaultProps} onSubmit={onSubmit} />);

			// フォーム入力
			await user.selectOptions(
				screen.getByLabelText('サービス区分'),
				'life-support',
			);
			await user.clear(screen.getByLabelText('開始時刻'));
			await user.type(screen.getByLabelText('開始時刻'), '09:00');
			await user.clear(screen.getByLabelText('終了時刻'));
			await user.type(screen.getByLabelText('終了時刻'), '10:00');

			// 担当者を選択
			await user.click(screen.getByText('未選択'));
			await user.click(screen.getByText('山田太郎'));
			await user.click(screen.getByRole('button', { name: '確定する' }));

			await user.click(screen.getByRole('button', { name: '反映' }));

			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalledWith(
					expect.objectContaining({
						staffIds: ['staff-1'],
						staffNames: ['山田太郎'],
					}),
				);
			});
		});
	});
});
