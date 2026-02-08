import {
	createBasicScheduleAction,
	deleteBasicScheduleAction,
	updateBasicScheduleAction,
} from '@/app/actions/basicSchedules';
import { createQuickServiceUserAction } from '@/app/actions/serviceUsers';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import * as actionResultHandler from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BasicScheduleForm } from './BasicScheduleForm';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

vi.mock('@/app/actions/basicSchedules', () => ({
	createBasicScheduleAction: vi.fn(),
	updateBasicScheduleAction: vi.fn(),
	deleteBasicScheduleAction: vi.fn(),
}));

vi.mock('@/app/actions/serviceUsers', () => ({
	createQuickServiceUserAction: vi.fn(),
}));

vi.spyOn(actionResultHandler, 'useActionResultHandler');
const handleActionResultMock = vi.mocked(
	actionResultHandler.useActionResultHandler,
);

const serviceUsers: ServiceUser[] = [
	{
		id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		office_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac8',
		name: '利用者A',
		address: '東京都',
		contract_status: 'active',
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
];

const serviceTypes: ServiceTypeOption[] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
];

const staffs: StaffRecord[] = [
	{
		id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		office_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac8',
		auth_user_id: null,
		name: '山田太郎',
		role: 'admin',
		email: 'yamada@example.com',
		note: 'ベテラン',
		service_type_ids: ['physical-care'],
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
];

const successResult = <T,>(data: T) => ({ data, error: null, status: 200 });

const sampleSchedule: BasicScheduleRecord = {
	id: '019b8917-62a6-703d-9acf-502cf1dc5f7c',
	client: {
		id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		name: '利用者A',
	},
	service_type_id: 'physical-care',
	staffs: [
		{
			id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
			name: '山田太郎',
		},
	],
	weekday: 'Mon',
	start_time: { hour: 9, minute: 0 },
	end_time: { hour: 10, minute: 0 },
	note: 'メモ',
	deleted_at: null,
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-01T00:00:00Z'),
};

describe('BasicScheduleForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		handleActionResultMock.mockReset();
		mockPush.mockClear();
		// handleActionResultMock.mockReturnValue(true);
	});

	it('必須項目が未入力の場合、登録ボタンが無効になる', async () => {
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		const submitButton = screen.getByRole('button', {
			name: 'スケジュールを登録',
		});
		expect(submitButton).toBeDisabled();
	});

	it('入力内容でcreateBasicScheduleActionを呼び出し、成功時にリセットする', async () => {
		const user = userEvent.setup();
		vi.mocked(createBasicScheduleAction).mockResolvedValue(
			successResult(sampleSchedule),
		);

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('利用者 *'),
			'019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		);
		// サービス区分はラジオボタンになったのでクリックで選択
		await user.click(screen.getByLabelText('身体介護'));
		await user.selectOptions(screen.getByLabelText('曜日 *'), 'Tue');
		await user.type(screen.getByLabelText('開始時刻 *'), '09:00');
		await user.type(screen.getByLabelText('終了時刻 *'), '10:00');
		await user.type(screen.getByLabelText('備考'), ' メモ ');

		await user.click(screen.getByRole('button', { name: '担当者を選択' }));
		await user.click(screen.getByLabelText('山田太郎を選択'));
		await user.click(screen.getByRole('button', { name: '確定する' }));

		await user.click(
			screen.getByRole('button', { name: 'スケジュールを登録' }),
		);

		await waitFor(() => {
			expect(createBasicScheduleAction).toHaveBeenCalledWith({
				client_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
				service_type_id: 'physical-care',
				weekday: 'Tue',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				staff_ids: ['019b8916-5594-773b-aaf3-f04e0f2b0ac7'],
				note: 'メモ',
			});
		});

		expect(handleActionResultMock).toHaveBeenCalled();

		await waitFor(() => {
			expect(screen.getByLabelText('利用者 *')).toHaveValue('');
			// ラジオボタンなのでcheckedを確認
			expect(screen.getByLabelText('身体介護')).not.toBeChecked();
			expect(screen.getByLabelText('開始時刻 *')).toHaveValue('');
		});

		// 成功後に一覧ページへ遷移することを確認
		expect(mockPush).toHaveBeenCalledWith('/admin/basic-schedules');
	});
});

describe('BasicScheduleForm (edit mode)', () => {
	const scheduleId = '019b8917-62a6-703d-9acf-502cf1dc5f7c';

	beforeEach(() => {
		vi.clearAllMocks();
		handleActionResultMock.mockReset();
		mockPush.mockClear();
	});

	it('編集モードでは利用者選択が無効化される', async () => {
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId={scheduleId}
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		const clientSelect = screen.getByLabelText(/利用者/);
		expect(clientSelect).toBeDisabled();
	});

	it('編集モードで更新ボタンと削除ボタンが表示される', async () => {
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId={scheduleId}
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		expect(
			screen.getByRole('button', { name: '更新する' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: '削除する' }),
		).toBeInTheDocument();
	});

	it('編集モードでフォーム送信時にupdateBasicScheduleActionが呼ばれる', async () => {
		const user = userEvent.setup();
		vi.mocked(updateBasicScheduleAction).mockResolvedValue(
			successResult(sampleSchedule),
		);

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId={scheduleId}
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '更新する' }));

		await waitFor(() => {
			expect(updateBasicScheduleAction).toHaveBeenCalledWith(scheduleId, {
				client_id: serviceUsers[0].id,
				service_type_id: 'physical-care',
				weekday: 'Mon',
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				staff_ids: [],
				note: null,
			});
		});
	});

	it('削除ボタンをクリックして確認するとdeleteBasicScheduleActionが呼ばれる', async () => {
		const user = userEvent.setup();
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		vi.mocked(deleteBasicScheduleAction).mockResolvedValue(successResult(null));

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId={scheduleId}
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '削除する' }));

		await waitFor(() => {
			expect(deleteBasicScheduleAction).toHaveBeenCalledWith(scheduleId);
		});
	});

	it('削除確認をキャンセルするとアクションは呼ばれない', async () => {
		const user = userEvent.setup();
		vi.spyOn(window, 'confirm').mockReturnValue(false);

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId={scheduleId}
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '削除する' }));

		expect(deleteBasicScheduleAction).not.toHaveBeenCalled();
	});
});

describe('BasicScheduleForm (新規利用者登録)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		handleActionResultMock.mockReset();
		mockPush.mockClear();
	});

	it('「新規利用者を登録」オプションを選択すると氏名入力フィールドが表示される', async () => {
		const user = userEvent.setup();
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		// 初期状態では氏名入力フィールドは非表示
		expect(
			screen.queryByLabelText('新規利用者の氏名 *'),
		).not.toBeInTheDocument();

		// 新規利用者を選択
		await user.selectOptions(screen.getByLabelText('利用者 *'), 'new');

		// 氏名入力フィールドが表示される
		expect(screen.getByLabelText('新規利用者の氏名 *')).toBeInTheDocument();
	});

	it('既存利用者を選択すると氏名入力フィールドが非表示になる', async () => {
		const user = userEvent.setup();
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		// 新規利用者を選択
		await user.selectOptions(screen.getByLabelText('利用者 *'), 'new');
		expect(screen.getByLabelText('新規利用者の氏名 *')).toBeInTheDocument();

		// 既存利用者を選択
		await user.selectOptions(
			screen.getByLabelText('利用者 *'),
			serviceUsers[0].id,
		);

		// 氏名入力フィールドが非表示になる
		expect(
			screen.queryByLabelText('新規利用者の氏名 *'),
		).not.toBeInTheDocument();
	});

	it('新規利用者選択時、氏名が空のままでは登録ボタンが無効', async () => {
		const user = userEvent.setup();
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		// 新規利用者を選択
		await user.selectOptions(screen.getByLabelText('利用者 *'), 'new');

		// 必須項目を入力
		await user.click(screen.getByLabelText('身体介護'));
		await user.type(screen.getByLabelText('開始時刻 *'), '09:00');
		await user.type(screen.getByLabelText('終了時刻 *'), '10:00');

		// 氏名は空のまま
		const submitButton = screen.getByRole('button', {
			name: 'スケジュールを登録',
		});
		expect(submitButton).toBeDisabled();
	});

	it('新規利用者登録フローでcreateQuickServiceUserActionとcreateBasicScheduleActionが順に呼ばれる', async () => {
		const user = userEvent.setup();
		const newClientId = '019b8916-5594-773b-aaf3-1234567890ab';

		vi.mocked(createQuickServiceUserAction).mockResolvedValue({
			data: {
				id: newClientId,
				office_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac8',
				name: '新規利用者',
				address: null,
				contract_status: 'active',
				created_at: new Date('2025-01-01T00:00:00Z'),
				updated_at: new Date('2025-01-01T00:00:00Z'),
			},
			error: null,
			status: 201,
		});
		vi.mocked(createBasicScheduleAction).mockResolvedValue(
			successResult(sampleSchedule),
		);

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
			/>,
		);

		// 新規利用者を選択して氏名入力
		await user.selectOptions(screen.getByLabelText('利用者 *'), 'new');
		await user.type(screen.getByLabelText('新規利用者の氏名 *'), '新規利用者');

		// 必須項目を入力
		await user.click(screen.getByLabelText('身体介護'));
		await user.selectOptions(screen.getByLabelText('曜日 *'), 'Tue');
		await user.type(screen.getByLabelText('開始時刻 *'), '09:00');
		await user.type(screen.getByLabelText('終了時刻 *'), '10:00');

		await user.click(
			screen.getByRole('button', { name: 'スケジュールを登録' }),
		);

		// 利用者作成が先に呼ばれる
		await waitFor(() => {
			expect(createQuickServiceUserAction).toHaveBeenCalledWith('新規利用者');
		});

		// その後、スケジュール作成が新しいclient_idで呼ばれる
		await waitFor(() => {
			expect(createBasicScheduleAction).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: newClientId,
				}),
			);
		});
	});

	it('編集モードでは「新規利用者を登録」オプションが表示されない', async () => {
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				mode="edit"
				scheduleId="019b8917-62a6-703d-9acf-502cf1dc5f7c"
				initialValues={{
					clientId: serviceUsers[0].id,
					serviceTypeId: 'physical-care',
					weekday: 'Mon',
					startTime: '09:00',
					endTime: '10:00',
				}}
			/>,
		);

		const clientSelect = screen.getByLabelText(/利用者/);
		// option要素を確認（編集モードでは disabled なのでオプション確認のみ）
		const options = clientSelect.querySelectorAll('option');
		const newOption = Array.from(options).find((opt) => opt.value === 'new');
		expect(newOption).toBeUndefined();
	});
});
