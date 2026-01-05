import { createBasicScheduleAction } from '@/app/actions/basicSchedules';
import type { ClientStaffAssignmentLink } from '@/app/actions/clientStaffAssignments';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import * as actionResultHandler from '@/hooks/useActionResultHandler';
import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BasicScheduleForm } from './BasicScheduleForm';
vi.mock('@/app/actions/basicSchedules', () => ({
	createBasicScheduleAction: vi.fn(),
}));

vi.spyOn(actionResultHandler, 'useActionResultHandler');
const handleActionResultMock = vi.mocked(actionResultHandler.useActionResultHandler);

const serviceUsers: ServiceUser[] = [
	{
		id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		office_id: 'office-1',
		name: '利用者A',
		address: '東京都',
		contract_status: 'active',
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
];

const serviceTypes: ServiceTypeOption[] = [
	{ id: '019b8916-7afe-75ce-adc3-ebd27f3ac000', name: '身体介護' },
	{ id: '019b8916-c382-75bf-9803-82b89a109b3c', name: '生活援助' },
];

const staffs: StaffRecord[] = [
	{
		id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		office_id: 'office-1',
		auth_user_id: null,
		name: '山田太郎',
		role: 'admin',
		email: 'yamada@example.com',
		note: 'ベテラン',
		service_type_ids: ['svc-1'],
		created_at: new Date('2025-01-01T00:00:00Z'),
		updated_at: new Date('2025-01-01T00:00:00Z'),
	},
];

const assignments: ClientStaffAssignmentLink[] = [
	{
		client_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		service_type_id: '019b8916-7afe-75ce-adc3-ebd27f3ac000',
		staff_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
	},
];

const successResult = <T,>(data: T) => ({ data, error: null, status: 200 });

const sampleSchedule: BasicScheduleRecord = {
	id: '019b8917-62a6-703d-9acf-502cf1dc5f7c',
	client_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
	service_type_id: '019b8916-7afe-75ce-adc3-ebd27f3ac000',
	staff_ids: ['019b8916-5594-773b-aaf3-f04e0f2b0ac7'],
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
		// handleActionResultMock.mockReturnValue(true);
	});

	it('必須項目が未入力の場合、登録ボタンが無効になる', async () => {
		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				assignments={assignments}
			/>,
		);

		const submitButton = screen.getByRole('button', { name: 'スケジュールを登録' });
		expect(submitButton).toBeDisabled();
	});

	it('入力内容でcreateBasicScheduleActionを呼び出し、成功時にリセットする', async () => {
		const user = userEvent.setup();
		vi.mocked(createBasicScheduleAction).mockResolvedValue(successResult(sampleSchedule));

		render(
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				assignments={assignments}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('利用者 *'),
			'019b8916-5594-773b-aaf3-f04e0f2b0ac7',
		);
		await user.selectOptions(
			screen.getByLabelText('サービス区分 *'),
			'019b8916-7afe-75ce-adc3-ebd27f3ac000',
		);
		await user.selectOptions(screen.getByLabelText('曜日 *'), 'Tue');
		await user.type(screen.getByLabelText('開始時刻 *'), '09:00');
		await user.type(screen.getByLabelText('終了時刻 *'), '10:00');
		await user.type(screen.getByLabelText('備考'), ' メモ ');

		await user.click(screen.getByRole('button', { name: '担当者を選択' }));
		await user.click(screen.getByLabelText('山田太郎を選択'));
		await user.click(screen.getByRole('button', { name: '確定する' }));

		await user.click(screen.getByRole('button', { name: 'スケジュールを登録' }));

		await waitFor(() => {
			expect(createBasicScheduleAction).toHaveBeenCalledWith({
				client_id: '019b8916-5594-773b-aaf3-f04e0f2b0ac7',
				service_type_id: '019b8916-7afe-75ce-adc3-ebd27f3ac000',
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
			expect(screen.getByLabelText('サービス区分 *')).toHaveValue('');
			expect(screen.getByLabelText('開始時刻 *')).toHaveValue('');
		});
	});
});
