import { TEST_IDS } from '@/test/helpers/testIds';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { AdjustmentWizardDialog } from './AdjustmentWizardDialog';

const stepHelperCandidatesSpy = vi.fn();
const stepDatetimeCandidatesSpy = vi.fn();

const actionMocks = vi.hoisted(() => ({
	suggestCandidateStaffForShiftAction: vi.fn(),
	suggestCandidateStaffForShiftWithNewDatetimeAction: vi.fn(),
	assignStaffWithCascadeUnassignAction: vi.fn(),
	updateDatetimeAndAssignWithCascadeUnassignAction: vi.fn(),
	validateStaffAvailabilityAction: vi.fn(),
	listStaffsAction: vi.fn(),
}));

vi.mock('@/app/actions/shifts', () => ({
	suggestCandidateStaffForShiftAction:
		actionMocks.suggestCandidateStaffForShiftAction,
	suggestCandidateStaffForShiftWithNewDatetimeAction:
		actionMocks.suggestCandidateStaffForShiftWithNewDatetimeAction,
	assignStaffWithCascadeUnassignAction:
		actionMocks.assignStaffWithCascadeUnassignAction,
	updateDatetimeAndAssignWithCascadeUnassignAction:
		actionMocks.updateDatetimeAndAssignWithCascadeUnassignAction,
	validateStaffAvailabilityAction: actionMocks.validateStaffAvailabilityAction,
}));

vi.mock('@/app/actions/staffs', () => ({
	listStaffsAction: actionMocks.listStaffsAction,
}));

vi.mock('./StepHelperCandidates', () => ({
	StepHelperCandidates: ({
		onComplete,
		requestCandidates,
		requestAssign,
	}: {
		onComplete: () => void;
		requestCandidates: unknown;
		requestAssign: unknown;
	}) => {
		stepHelperCandidatesSpy({ requestCandidates, requestAssign });
		return (
			<div>
				<p>ヘルパー候補ステップ</p>
				<button
					type="button"
					onClick={async () => {
						await (
							requestAssign as (input: {
								shiftId: string;
								newStaffId: string;
							}) => Promise<unknown>
						)({
							shiftId: TEST_IDS.SCHEDULE_1,
							newStaffId: TEST_IDS.STAFF_1,
						});
						onComplete();
					}}
				>
					候補を確定
				</button>
			</div>
		);
	},
}));

vi.mock('./StepDatetimeInput', () => ({
	StepDatetimeInput: ({
		onShowCandidates,
	}: {
		onShowCandidates: (payload: {
			newStartTime: Date;
			newEndTime: Date;
		}) => void;
	}) => (
		<div>
			<p>日時入力ステップ</p>
			<button
				type="button"
				onClick={() =>
					onShowCandidates({
						newStartTime: new Date('2026-02-22T09:00:00+09:00'),
						newEndTime: new Date('2026-02-22T10:00:00+09:00'),
					})
				}
			>
				候補を表示
			</button>
		</div>
	),
}));

vi.mock('./StepDatetimeCandidates', () => ({
	StepDatetimeCandidates: ({
		requestCandidates,
		requestAssign,
	}: {
		requestCandidates: unknown;
		requestAssign: unknown;
	}) => {
		stepDatetimeCandidatesSpy({ requestCandidates, requestAssign });
		return (
			<div>
				<p>日時候補ステップ</p>
				<button
					type="button"
					onClick={async () => {
						await (
							requestAssign as (input: {
								shiftId: string;
								newStaffId: string;
								newStartTime: Date;
								newEndTime: Date;
							}) => Promise<unknown>
						)({
							shiftId: TEST_IDS.SCHEDULE_1,
							newStaffId: TEST_IDS.STAFF_1,
							newStartTime: new Date('2026-02-22T09:00:00+09:00'),
							newEndTime: new Date('2026-02-22T10:00:00+09:00'),
						});
					}}
				>
					候補を確定
				</button>
			</div>
		);
	},
}));

const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function showModal() {
		this.setAttribute('open', '');
	};

	HTMLDialogElement.prototype.close = function close() {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
});

afterAll(() => {
	HTMLDialogElement.prototype.showModal = originalShowModal;
	HTMLDialogElement.prototype.close = originalClose;
});

beforeEach(() => {
	stepHelperCandidatesSpy.mockClear();
	stepDatetimeCandidatesSpy.mockClear();
	actionMocks.suggestCandidateStaffForShiftAction.mockResolvedValue({
		data: { candidates: [] },
		error: null,
		status: 200,
	});
	actionMocks.suggestCandidateStaffForShiftWithNewDatetimeAction.mockResolvedValue(
		{
			data: { candidates: [] },
			error: null,
			status: 200,
		},
	);
	actionMocks.assignStaffWithCascadeUnassignAction.mockResolvedValue({
		data: {
			updatedShift: {
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				service_type_id: 'physical-care',
				staff_id: TEST_IDS.STAFF_1,
				date: new Date('2026-02-22'),
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				status: 'scheduled',
				is_unassigned: false,
				canceled_reason: null,
				canceled_category: null,
				canceled_at: null,
				created_at: new Date('2026-02-22T00:00:00Z'),
				updated_at: new Date('2026-02-22T00:00:00Z'),
			},
			cascadeUnassignedShiftIds: [],
		},
		error: null,
		status: 200,
	});
	actionMocks.updateDatetimeAndAssignWithCascadeUnassignAction.mockResolvedValue(
		{
			data: {
				updatedShift: {
					id: TEST_IDS.SCHEDULE_1,
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					date: new Date('2026-02-22'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					status: 'scheduled',
					is_unassigned: false,
					canceled_reason: null,
					canceled_category: null,
					canceled_at: null,
					created_at: new Date('2026-02-22T00:00:00Z'),
					updated_at: new Date('2026-02-22T00:00:00Z'),
				},
				cascadeUnassignedShiftIds: [TEST_IDS.SCHEDULE_2],
			},
			error: null,
			status: 200,
		},
	);
	actionMocks.validateStaffAvailabilityAction.mockResolvedValue({
		data: { available: true, conflictingShifts: [] },
		error: null,
		status: 200,
	});
	actionMocks.listStaffsAction.mockResolvedValue({
		data: [],
		error: null,
		status: 200,
	});
});

describe('AdjustmentWizardDialog', () => {
	it('各Stepに requestCandidates / requestAssign を注入する', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		expect(stepHelperCandidatesSpy).toHaveBeenCalled();
		const helperProps = stepHelperCandidatesSpy.mock.lastCall?.[0] as {
			requestCandidates: unknown;
			requestAssign: unknown;
		};
		expect(helperProps.requestCandidates).toBeTypeOf('function');
		expect(helperProps.requestAssign).toBeTypeOf('function');

		await user.click(screen.getByRole('button', { name: '戻る' }));
		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		expect(stepDatetimeCandidatesSpy).toHaveBeenCalled();
		const datetimeProps = stepDatetimeCandidatesSpy.mock.lastCall?.[0] as {
			requestCandidates: unknown;
			requestAssign: unknown;
		};
		expect(datetimeProps.requestCandidates).toBeTypeOf('function');
		expect(datetimeProps.requestAssign).toBeTypeOf('function');
	});

	it('helper割当は永続化せずに成功を返す', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));

		const helperProps = stepHelperCandidatesSpy.mock.lastCall?.[0] as {
			requestAssign: (input: {
				shiftId: string;
				newStaffId: string;
			}) => Promise<{
				data: {
					cascadeUnassignedShiftIds: string[];
				} | null;
				error: string | null;
				status: number;
			}>;
		};

		const result = await helperProps.requestAssign({
			shiftId: TEST_IDS.SCHEDULE_1,
			newStaffId: TEST_IDS.STAFF_1,
		});

		expect(
			actionMocks.assignStaffWithCascadeUnassignAction,
		).not.toHaveBeenCalled();
		expect(result.data?.cascadeUnassignedShiftIds).toEqual([]);
	});

	it('datetime割当は永続化せずに成功を返す', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		const datetimeProps = stepDatetimeCandidatesSpy.mock.lastCall?.[0] as {
			requestAssign: (input: {
				shiftId: string;
				newStaffId: string;
				newStartTime: Date;
				newEndTime: Date;
			}) => Promise<{
				data: {
					updatedShift: { id: string };
					cascadeUnassignedShiftIds: string[];
				} | null;
				error: string | null;
				status: number;
			}>;
		};

		const payload = {
			shiftId: TEST_IDS.SCHEDULE_1,
			newStaffId: TEST_IDS.STAFF_1,
			newStartTime: new Date('2026-02-22T09:00:00+09:00'),
			newEndTime: new Date('2026-02-22T10:00:00+09:00'),
		};
		const result = await datetimeProps.requestAssign(payload);

		expect(
			actionMocks.updateDatetimeAndAssignWithCascadeUnassignAction,
		).not.toHaveBeenCalled();
		expect(result.data?.cascadeUnassignedShiftIds).toEqual([]);
	});

	it('Step3B候補取得は suggestCandidateStaffForShiftWithNewDatetimeAction を呼び出す', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		await user.click(screen.getByRole('button', { name: '候補を表示' }));

		const datetimeProps = stepDatetimeCandidatesSpy.mock.lastCall?.[0] as {
			requestCandidates: (input: {
				shiftId: string;
				newStartTime: Date;
				newEndTime: Date;
			}) => Promise<{
				data: {
					candidates: Array<{ staffId: string; staffName: string }>;
				} | null;
				error: string | null;
				status: number;
			}>;
		};

		const payload = {
			shiftId: TEST_IDS.SCHEDULE_1,
			newStartTime: new Date('2026-02-22T09:00:00+09:00'),
			newEndTime: new Date('2026-02-22T10:00:00+09:00'),
		};

		await datetimeProps.requestCandidates(payload);

		expect(
			actionMocks.suggestCandidateStaffForShiftWithNewDatetimeAction,
		).toHaveBeenCalledWith(payload);
		expect(
			actionMocks.suggestCandidateStaffForShiftAction,
		).not.toHaveBeenCalled();
		expect(actionMocks.validateStaffAvailabilityAction).not.toHaveBeenCalled();
	});

	it('helper候補生成は提案済み候補のみを対象にし、現在担当/非適合候補を含めない', async () => {
		const user = userEvent.setup();
		actionMocks.suggestCandidateStaffForShiftAction.mockResolvedValue({
			data: {
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '適合スタッフ',
						conflictingShifts: [],
					},
				],
			},
			error: null,
			status: 200,
		});
		actionMocks.listStaffsAction.mockResolvedValue({
			data: [
				{
					id: TEST_IDS.STAFF_1,
					office_id: TEST_IDS.OFFICE_1,
					auth_user_id: null,
					name: '適合スタッフ',
					role: 'helper',
					email: null,
					note: null,
					service_type_ids: ['physical-care'],
					created_at: new Date('2026-02-22T00:00:00Z'),
					updated_at: new Date('2026-02-22T00:00:00Z'),
				},
				{
					id: TEST_IDS.STAFF_2,
					office_id: TEST_IDS.OFFICE_1,
					auth_user_id: null,
					name: '現在担当または非適合スタッフ',
					role: 'helper',
					email: null,
					note: null,
					service_type_ids: ['housekeeping'],
					created_at: new Date('2026-02-22T00:00:00Z'),
					updated_at: new Date('2026-02-22T00:00:00Z'),
				},
			],
			error: null,
			status: 200,
		});

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));

		const helperProps = stepHelperCandidatesSpy.mock.lastCall?.[0] as {
			requestCandidates: (input: { shiftId: string }) => Promise<{
				data: {
					candidates: Array<{ staffId: string; staffName: string }>;
				} | null;
				error: string | null;
				status: number;
			}>;
		};

		const result = await helperProps.requestCandidates({
			shiftId: TEST_IDS.SCHEDULE_1,
		});

		expect(
			actionMocks.suggestCandidateStaffForShiftAction,
		).toHaveBeenCalledWith({
			shiftId: TEST_IDS.SCHEDULE_1,
		});
		expect(actionMocks.listStaffsAction).not.toHaveBeenCalled();
		expect(actionMocks.validateStaffAvailabilityAction).toHaveBeenCalledTimes(
			1,
		);
		expect(actionMocks.validateStaffAvailabilityAction).toHaveBeenCalledWith({
			staffId: TEST_IDS.STAFF_1,
			startTime: new Date('2026-02-22T09:00:00+09:00').toISOString(),
			endTime: new Date('2026-02-22T10:00:00+09:00').toISOString(),
			excludeShiftId: TEST_IDS.SCHEDULE_1,
		});
		expect(result.data?.candidates).toEqual([
			{
				staffId: TEST_IDS.STAFF_1,
				staffName: '適合スタッフ',
				conflictingShifts: [],
			},
		]);
	});

	it('helper候補生成のエラー契約: 4xxはstatus/detailsを保持し、500はdetailsをマスクする', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));

		const helperProps = stepHelperCandidatesSpy.mock.lastCall?.[0] as {
			requestCandidates: (input: { shiftId: string }) => Promise<{
				data: {
					candidates: Array<{ staffId: string; staffName: string }>;
				} | null;
				error: string | null;
				status: number;
				details?: unknown;
			}>;
		};

		actionMocks.suggestCandidateStaffForShiftAction.mockResolvedValue({
			data: {
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '適合スタッフ',
						conflictingShifts: [],
					},
				],
			},
			error: null,
			status: 200,
		});

		actionMocks.validateStaffAvailabilityAction.mockResolvedValueOnce({
			data: null,
			error: 'Validation failed',
			status: 400,
			details: { fieldErrors: { startTime: ['invalid'] } },
		});

		const clientErrorResult = await helperProps.requestCandidates({
			shiftId: TEST_IDS.SCHEDULE_1,
		});
		expect(clientErrorResult.status).toBe(400);
		expect(clientErrorResult.details).toEqual({
			fieldErrors: { startTime: ['invalid'] },
		});

		actionMocks.validateStaffAvailabilityAction.mockResolvedValueOnce({
			data: null,
			error: 'Internal Server Error',
			status: 500,
			details: { stack: 'sensitive' },
		});

		const serverErrorResult = await helperProps.requestCandidates({
			shiftId: TEST_IDS.SCHEDULE_1,
		});
		expect(serverErrorResult.status).toBe(500);
		expect(serverErrorResult.details).toBeUndefined();
	});

	it('isOpen=false のときは open されない', () => {
		const { container } = render(
			<AdjustmentWizardDialog
				isOpen={false}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		expect(container.querySelector('dialog')).toBeInTheDocument();
		expect(container.querySelector('dialog')).not.toHaveAttribute('open');
	});

	it('開くとStep1（処理選択）が表示される', () => {
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('処理を選択')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'ヘルパーの変更' }),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '日時の変更' })).toBeEnabled();
	});

	it('ヘルパーの変更を選ぶとStepが進み、戻るでStep1に戻れる', async () => {
		const user = userEvent.setup();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		expect(screen.getByText('ヘルパー候補ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '戻る' }));
		expect(screen.getByText('処理を選択')).toBeInTheDocument();
	});

	it('日時変更ルート: input -> candidates へ遷移し、戻るでinputへ戻る', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '候補を表示' }));
		expect(screen.getByText('日時候補ステップ')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '戻る' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();
	});

	it('ヘルパー候補確定時に onAssigned に提案データを渡す', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onAssigned = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
				onAssigned={onAssigned}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		await user.click(screen.getByRole('button', { name: '候補を確定' }));

		expect(onAssigned).toHaveBeenCalledWith({
			shiftId: TEST_IDS.SCHEDULE_1,
			newStaffId: TEST_IDS.STAFF_1,
			newStartTime: new Date('2026-02-22T00:00:00.000Z'),
			newEndTime: new Date('2026-02-22T01:00:00.000Z'),
		});
	});

	it('ヘルパー候補完了時に onClose が呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'ヘルパーの変更' }));
		await user.click(screen.getByRole('button', { name: '候補を確定' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('close -> reopen で step が select にリセットされる', async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();

		rerender(
			<AdjustmentWizardDialog
				isOpen={false}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		rerender(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText('処理を選択')).toBeInTheDocument();
		});
		expect(screen.queryByText('日時入力ステップ')).not.toBeInTheDocument();
	});

	it('表示中に shiftId が変わると step が select にリセットされる', async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '日時の変更' }));
		expect(screen.getByText('日時入力ステップ')).toBeInTheDocument();

		rerender(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_2}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText('処理を選択')).toBeInTheDocument();
			expect(screen.queryByText('日時入力ステップ')).not.toBeInTheDocument();
		});
	});

	it('Escキャンセル時にonCloseが呼ばれる', () => {
		const onClose = vi.fn();

		render(
			<AdjustmentWizardDialog
				isOpen={true}
				shiftId={TEST_IDS.SCHEDULE_1}
				initialStartTime={new Date('2026-02-22T09:00:00+09:00')}
				initialEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onClose={onClose}
			/>,
		);

		const dialog = screen.getByRole('dialog');
		fireEvent(
			dialog,
			new Event('cancel', {
				bubbles: false,
				cancelable: true,
			}),
		);

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
