import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClientWeeklyScheduleEditor } from './ClientWeeklyScheduleEditor';
import type { InitialScheduleData } from './types';

const createTestSchedule = (
	id: string,
	weekday: DayOfWeek,
	overrides: Partial<InitialScheduleData['data']> = {},
): InitialScheduleData => ({
	id,
	data: {
		weekday,
		serviceTypeId: 'physical-care' as ServiceTypeId,
		staffIds: ['staff-1'],
		staffNames: ['田中太郎'],
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		note: null,
		...overrides,
	},
});

const defaultProps = {
	clientId: 'client-1',
	clientName: '山田太郎',
	initialSchedules: [] as InitialScheduleData[],
	serviceTypeOptions: [
		{ id: 'physical-care' as ServiceTypeId, name: '身体介護' },
		{ id: 'life-support' as ServiceTypeId, name: '生活支援' },
		{ id: 'commute-support' as ServiceTypeId, name: '通院サポート' },
	],
	staffOptions: [
		{
			id: 'staff-1',
			name: '田中太郎',
			role: 'helper' as const,
			serviceTypeIds: ['physical-care', 'life-support'] as ServiceTypeId[],
		},
		{
			id: 'staff-2',
			name: '佐藤花子',
			role: 'admin' as const,
			serviceTypeIds: ['life-support'] as ServiceTypeId[],
		},
	],
	onSave: vi.fn(),
};

describe('ClientWeeklyScheduleEditor', () => {
	describe('レンダリング', () => {
		it('利用者名と7日分の曜日列が表示される', () => {
			render(<ClientWeeklyScheduleEditor {...defaultProps} />);

			expect(screen.getByText('山田太郎')).toBeInTheDocument();
			expect(screen.getByText('月曜日')).toBeInTheDocument();
			expect(screen.getByText('火曜日')).toBeInTheDocument();
			expect(screen.getByText('水曜日')).toBeInTheDocument();
			expect(screen.getByText('木曜日')).toBeInTheDocument();
			expect(screen.getByText('金曜日')).toBeInTheDocument();
			expect(screen.getByText('土曜日')).toBeInTheDocument();
			expect(screen.getByText('日曜日')).toBeInTheDocument();
		});

		it('登録ボタンが表示される', () => {
			render(<ClientWeeklyScheduleEditor {...defaultProps} />);

			expect(
				screen.getByRole('button', { name: '登録する' }),
			).toBeInTheDocument();
		});

		it('初期データがグリッドに表示される', () => {
			const initialSchedules = [
				createTestSchedule('schedule-1', 'Mon'),
				createTestSchedule('schedule-2', 'Tue'),
			];

			render(
				<ClientWeeklyScheduleEditor
					{...defaultProps}
					initialSchedules={initialSchedules}
				/>,
			);

			expect(screen.getAllByTestId('schedule-card')).toHaveLength(2);
		});
	});

	describe('新規追加フロー', () => {
		it('曜日の追加ボタンをクリックするとフォームが開く', async () => {
			const user = userEvent.setup();
			render(<ClientWeeklyScheduleEditor {...defaultProps} />);

			await user.click(screen.getByRole('button', { name: '月曜日に追加' }));

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByText('予定を追加')).toBeInTheDocument();
		});

		it('フォームを送信するとスケジュールが追加される', async () => {
			const user = userEvent.setup();
			render(<ClientWeeklyScheduleEditor {...defaultProps} />);

			await user.click(screen.getByRole('button', { name: '月曜日に追加' }));

			// フォームに入力
			await user.selectOptions(
				screen.getByLabelText('サービス区分'),
				'physical-care',
			);
			await user.clear(screen.getByLabelText('開始時刻'));
			await user.type(screen.getByLabelText('開始時刻'), '09:00');
			await user.clear(screen.getByLabelText('終了時刻'));
			await user.type(screen.getByLabelText('終了時刻'), '10:00');

			await user.click(screen.getByRole('button', { name: '反映' }));

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(screen.getByTestId('schedule-card')).toBeInTheDocument();
		});
	});

	describe('編集フロー', () => {
		it('カードをクリックすると編集フォームが開く', async () => {
			const user = userEvent.setup();
			const initialSchedules = [createTestSchedule('schedule-1', 'Mon')];

			render(
				<ClientWeeklyScheduleEditor
					{...defaultProps}
					initialSchedules={initialSchedules}
				/>,
			);

			await user.click(screen.getByTestId('schedule-card'));

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByText('予定を編集')).toBeInTheDocument();
		});
	});

	describe('削除フロー', () => {
		it('削除ボタンでスケジュールがdeleted状態になる', async () => {
			const user = userEvent.setup();
			const initialSchedules = [createTestSchedule('schedule-1', 'Mon')];

			render(
				<ClientWeeklyScheduleEditor
					{...defaultProps}
					initialSchedules={initialSchedules}
				/>,
			);

			await user.click(screen.getByRole('button', { name: '削除' }));

			expect(screen.getByRole('status')).toHaveTextContent('削除');
		});
	});

	describe('保存', () => {
		it('登録ボタンをクリックするとonSaveが呼ばれる', async () => {
			const user = userEvent.setup();
			const onSave = vi.fn().mockResolvedValue(undefined);
			const initialSchedules = [createTestSchedule('schedule-1', 'Mon')];

			render(
				<ClientWeeklyScheduleEditor
					{...defaultProps}
					initialSchedules={initialSchedules}
					onSave={onSave}
				/>,
			);

			await user.click(screen.getByRole('button', { name: '登録する' }));

			expect(onSave).toHaveBeenCalled();
		});
	});
});
