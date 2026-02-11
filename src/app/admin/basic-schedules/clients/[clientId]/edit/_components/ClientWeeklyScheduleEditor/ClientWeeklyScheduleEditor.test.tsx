import type { StaffRecord } from '@/models/staffActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClientWeeklyScheduleEditor } from './ClientWeeklyScheduleEditor';
import type { InitialScheduleData } from './types';

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

// テスト用 UUID 定数（RFC 4122 UUID v4 準拠）
const TEST_STAFF_1_ID = '11111111-1111-4111-a111-111111111111';
const TEST_STAFF_2_ID = '22222222-2222-4222-a222-222222222222';
const TEST_CLIENT_ID = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';
const TEST_OFFICE_ID = 'ffffffff-ffff-4fff-afff-ffffffffffff';
const TEST_SCHEDULE_1_ID = '33333333-3333-4333-a333-333333333333';
const TEST_SCHEDULE_2_ID = '44444444-4444-4444-a444-444444444444';

const createTestSchedule = (
	id: string,
	weekday: DayOfWeek,
	overrides: Partial<InitialScheduleData['data']> = {},
): InitialScheduleData => ({
	id,
	data: {
		weekday,
		serviceTypeId: 'physical-care' as ServiceTypeId,
		staffIds: [TEST_STAFF_1_ID],
		staffNames: ['田中太郎'],
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		note: null,
		...overrides,
	},
});

const createTestStaff = (
	id: string,
	name: string,
	overrides: Partial<StaffRecord> = {},
): StaffRecord => ({
	id,
	office_id: TEST_OFFICE_ID,
	name,
	role: 'helper',
	email: null,
	note: null,
	auth_user_id: null,
	created_at: new Date('2026-01-01T00:00:00Z'),
	updated_at: new Date('2026-01-01T00:00:00Z'),
	service_type_ids: ['physical-care', 'life-support'] as ServiceTypeId[],
	...overrides,
});

const defaultProps = {
	clientId: TEST_CLIENT_ID,
	clientName: '山田太郎',
	initialSchedules: [] as InitialScheduleData[],
	serviceTypeOptions: [
		{ id: 'physical-care' as ServiceTypeId, name: '身体介護' },
		{ id: 'life-support' as ServiceTypeId, name: '生活支援' },
		{ id: 'commute-support' as ServiceTypeId, name: '通院サポート' },
	],
	staffs: [
		createTestStaff(TEST_STAFF_1_ID, '田中太郎'),
		createTestStaff(TEST_STAFF_2_ID, '佐藤花子', {
			role: 'admin',
			service_type_ids: ['life-support'] as ServiceTypeId[],
		}),
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
				createTestSchedule(TEST_SCHEDULE_1_ID, 'Mon'),
				createTestSchedule(TEST_SCHEDULE_2_ID, 'Tue'),
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

			// ダイアログが開くのを待つ
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// フォームに入力
			const radioButton = screen.getByRole('radio', { name: /身体介護/i });
			await user.click(radioButton);

			// ラジオボタンが選択されるのを待つ
			await waitFor(() => {
				expect(radioButton).toBeChecked();
			});

			await user.clear(screen.getByLabelText('開始時刻 *'));
			await user.type(screen.getByLabelText('開始時刻 *'), '09:00');
			await user.clear(screen.getByLabelText('終了時刻 *'));
			await user.type(screen.getByLabelText('終了時刻 *'), '10:00');

			// スタッフを選択（スタッフピッカーダイアログを開く）
			const staffPickerButton = screen.getByRole('button', {
				name: '担当者を選択',
			});
			await user.click(staffPickerButton);

			// スタッフピッカーダイアログが開くのを待つ
			await waitFor(() => {
				expect(screen.getByLabelText('田中太郎を選択')).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText('田中太郎を選択'));
			await user.click(screen.getByRole('button', { name: '確定する' }));

			// スタッフピッカーが閉じて外側のダイアログが表示されるのを待つ
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});

			// 送信ボタンが有効になるのを待つ
			const submitButton = screen.getByRole('button', {
				name: 'スケジュールを登録',
			});
			await waitFor(() => {
				expect(submitButton).not.toBeDisabled();
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(screen.getByTestId('schedule-card')).toBeInTheDocument();
		});
	});

	describe('編集フロー', () => {
		it('カードをクリックすると編集フォームが開く', async () => {
			const user = userEvent.setup();
			const initialSchedules = [createTestSchedule(TEST_SCHEDULE_1_ID, 'Mon')];

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
			const initialSchedules = [createTestSchedule(TEST_SCHEDULE_1_ID, 'Mon')];

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
			const initialSchedules = [createTestSchedule(TEST_SCHEDULE_1_ID, 'Mon')];

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
