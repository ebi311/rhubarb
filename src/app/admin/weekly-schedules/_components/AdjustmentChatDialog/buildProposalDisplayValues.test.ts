import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import { buildProposalDisplayValues } from './buildProposalDisplayValues';

const shiftContext = {
	id: TEST_IDS.SCHEDULE_1,
	clientId: TEST_IDS.CLIENT_1,
	serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
	clientName: '田中太郎',
	staffName: '山田太郎',
	date: '2026-02-24',
	startTime: '10:00',
	endTime: '11:00',
};

const staffOptions: StaffPickerOption[] = [
	{
		id: TEST_IDS.STAFF_1,
		name: '山田太郎',
		role: 'helper',
		serviceTypeIds: [TEST_IDS.SERVICE_TYPE_1],
	},
	{
		id: TEST_IDS.STAFF_2,
		name: '鈴木花子',
		role: 'helper',
		serviceTypeIds: [TEST_IDS.SERVICE_TYPE_1],
	},
];

describe('buildProposalDisplayValues', () => {
	it('change_shift_staff でスタッフ名を解決する', () => {
		const result = buildProposalDisplayValues({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			},
			shiftContext,
			staffOptions,
		});

		expect(result).toEqual({
			beforeValue: '山田太郎',
			afterValue: '鈴木花子',
		});
	});

	it('update_shift_time は JST の HH:mm〜HH:mm で返す', () => {
		const result = buildProposalDisplayValues({
			proposal: {
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_1,
				startAt: '2026-02-24T00:30:00Z',
				endAt: '2026-02-24T02:00:00Z',
			},
			shiftContext,
			staffOptions,
		});

		expect(result).toEqual({
			beforeValue: '10:00〜11:00',
			afterValue: '09:30〜11:00',
		});
	});

	it('change_shift_staff で staffOptions にない場合は toStaffId をフォールバック表示する', () => {
		const unknownStaffId = createTestId();
		const result = buildProposalDisplayValues({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: unknownStaffId,
			},
			shiftContext,
			staffOptions,
		});

		expect(result).toEqual({
			beforeValue: '山田太郎',
			afterValue: unknownStaffId,
		});
	});

	it('shiftContext.staffName が undefined の場合は 未割当 を返す', () => {
		const result = buildProposalDisplayValues({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			},
			shiftContext: {
				...shiftContext,
				staffName: undefined,
			},
			staffOptions,
		});

		expect(result).toEqual({
			beforeValue: '未割当',
			afterValue: '鈴木花子',
		});
	});
});
