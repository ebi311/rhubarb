import type { ActionResult } from '@/app/actions/utils/actionResult';
import {
	type AssignStaffWithCascadeOutput,
	type SuggestCandidateStaffForShiftOutput,
} from '@/models/shiftActionSchemas';
import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import { describe, expect, it, vi } from 'vitest';
import { StepDatetimeCandidates } from './StepDatetimeCandidates';

vi.mock('react-toastify', () => ({
	toast: {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
	},
}));

const successResult = <T,>(data: T): ActionResult<T> => ({
	data,
	error: null,
	status: 200,
});

const createCandidates = (
	count: number,
): SuggestCandidateStaffForShiftOutput => ({
	candidates: Array.from({ length: count }, (_, index) => ({
		staffId: createTestId(),
		staffName: `候補${index + 1}`,
		conflictingShifts:
			index % 2 === 0
				? [
						{
							shiftId: createTestId(),
							clientName: `利用者${index + 1}`,
							date: '2026-02-20',
							startTime: { hour: 9, minute: 0 },
							endTime: { hour: 10, minute: 0 },
						},
					]
				: [],
	})),
});

describe('StepDatetimeCandidates', () => {
	it('ローディング表示の後に候補を5件表示し、ページングできる', async () => {
		const requestCandidates = vi
			.fn()
			.mockResolvedValue(successResult(createCandidates(6)));

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				requestCandidates={requestCandidates}
				requestAssign={vi.fn()}
			/>,
		);

		expect(screen.getByText('候補スタッフを取得中...')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /候補1/ })).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: /候補5/ })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /候補6/ }),
		).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: '他の候補' }));

		expect(screen.getByRole('button', { name: /候補6/ })).toBeInTheDocument();
	});

	it('候補なしを表示する', async () => {
		const requestCandidates = vi
			.fn()
			.mockResolvedValue(successResult({ candidates: [] }));

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				requestCandidates={requestCandidates}
				requestAssign={vi.fn()}
			/>,
		);

		expect(
			await screen.findByText('候補スタッフが見つかりませんでした。'),
		).toBeInTheDocument();
	});

	it('重複ありバッジと利用者名/時間を表示する', async () => {
		const requestCandidates = vi.fn().mockResolvedValue(
			successResult({
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '山田太郎',
						conflictingShifts: [
							{
								shiftId: createTestId(),
								clientName: '田中様',
								date: '2026-02-22',
								startTime: { hour: 9, minute: 30 },
								endTime: { hour: 10, minute: 30 },
							},
						],
					},
				],
			}),
		);

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				requestCandidates={requestCandidates}
				requestAssign={vi.fn()}
			/>,
		);

		expect(await screen.findByText('重複あり')).toBeInTheDocument();
		expect(screen.getByText('田中様 09:30-10:30')).toBeInTheDocument();
	});

	it('同一表示文言の重複シフトでも React key 警告を出さない', async () => {
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		try {
			const requestCandidates = vi.fn().mockResolvedValue(
				successResult({
					candidates: [
						{
							staffId: TEST_IDS.STAFF_1,
							staffName: '山田太郎',
							conflictingShifts: [
								{
									shiftId: TEST_IDS.SCHEDULE_1,
									clientName: '田中様',
									date: '2026-02-22',
									startTime: { hour: 9, minute: 30 },
									endTime: { hour: 10, minute: 30 },
								},
								{
									shiftId: TEST_IDS.SCHEDULE_2,
									clientName: '田中様',
									date: '2026-02-22',
									startTime: { hour: 9, minute: 30 },
									endTime: { hour: 10, minute: 30 },
								},
							],
						},
					],
				}),
			);

			render(
				<StepDatetimeCandidates
					shiftId={TEST_IDS.SCHEDULE_1}
					newStartTime={new Date('2026-02-22T09:00:00+09:00')}
					newEndTime={new Date('2026-02-22T10:00:00+09:00')}
					onComplete={vi.fn()}
					requestCandidates={requestCandidates}
					requestAssign={vi.fn()}
				/>,
			);

			const duplicatedConflicts =
				await screen.findAllByText('田中様 09:30-10:30');
			expect(duplicatedConflicts).toHaveLength(2);

			const hasDuplicateKeyWarning = consoleErrorSpy.mock.calls.some((args) =>
				args.some((arg) =>
					String(arg).includes('Encountered two children with the same key'),
				),
			);

			expect(hasDuplicateKeyWarning).toBe(false);
		} finally {
			consoleErrorSpy.mockRestore();
		}
	});

	it('候補取得エラー時にエラートーストを表示する', async () => {
		const requestCandidates = vi.fn().mockRejectedValue(new Error('network'));

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				requestCandidates={requestCandidates}
				requestAssign={vi.fn()}
			/>,
		);

		expect(
			await screen.findByText('候補スタッフが見つかりませんでした。'),
		).toBeInTheDocument();
		expect(toast.error).toHaveBeenCalledWith(
			'候補スタッフの取得に失敗しました。時間をおいて再度お試しください。',
		);
	});

	it('候補クリックで更新し、連鎖なしならsuccess toastとonCompleteを呼ぶ', async () => {
		const requestCandidates = vi.fn().mockResolvedValue(
			successResult({
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '山田太郎',
						conflictingShifts: [],
					},
				],
			}),
		);
		const requestAssign = vi
			.fn<
				(args: {
					shiftId: string;
					newStaffId: string;
					newStartTime: Date;
					newEndTime: Date;
				}) => Promise<ActionResult<AssignStaffWithCascadeOutput>>
			>()
			.mockResolvedValue(
				successResult({
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
				}),
			);
		const onComplete = vi.fn();

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={onComplete}
				requestCandidates={requestCandidates}
				requestAssign={requestAssign}
			/>,
		);

		await userEvent.click(
			await screen.findByRole('button', { name: '山田太郎' }),
		);

		await waitFor(() => {
			expect(requestAssign).toHaveBeenCalledWith({
				shiftId: TEST_IDS.SCHEDULE_1,
				newStaffId: TEST_IDS.STAFF_1,
				newStartTime: new Date('2026-02-22T09:00:00+09:00'),
				newEndTime: new Date('2026-02-22T10:00:00+09:00'),
			});
		});
		expect(toast.success).toHaveBeenCalledWith(
			'山田太郎さんへの変更を反映しました。',
		);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('連鎖ありならwarning toastを出し、onClickでonCascadeReopenを呼ぶ', async () => {
		const cascadeShiftIds = [createTestId(), createTestId()];
		const requestCandidates = vi.fn().mockResolvedValue(
			successResult({
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '山田太郎',
						conflictingShifts: [],
					},
				],
			}),
		);
		const requestAssign = vi.fn().mockResolvedValue(
			successResult({
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
				cascadeUnassignedShiftIds: cascadeShiftIds,
			}),
		);
		const onCascadeReopen = vi.fn();

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				onCascadeReopen={onCascadeReopen}
				requestCandidates={requestCandidates}
				requestAssign={requestAssign}
			/>,
		);

		await userEvent.click(
			await screen.findByRole('button', { name: '山田太郎' }),
		);

		await waitFor(() => {
			expect(toast.warning).toHaveBeenCalledTimes(1);
		});
		expect(toast.warning).toHaveBeenCalledWith(
			'山田太郎さんに変更し、2件のシフトが未割当になりました（クリックで確認）',
			expect.any(Object),
		);

		const [, options] = vi.mocked(toast.warning).mock.calls[0] ?? [];
		const warningOptions = options as { onClick?: () => void } | undefined;
		warningOptions?.onClick?.();

		expect(onCascadeReopen).toHaveBeenCalledWith(cascadeShiftIds);
	});

	it('assign エラー時はエラートーストを表示する', async () => {
		const requestCandidates = vi.fn().mockResolvedValue(
			successResult({
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '山田太郎',
						conflictingShifts: [],
					},
				],
			}),
		);
		const requestAssign = vi.fn().mockRejectedValue(new Error('network'));

		render(
			<StepDatetimeCandidates
				shiftId={TEST_IDS.SCHEDULE_1}
				newStartTime={new Date('2026-02-22T09:00:00+09:00')}
				newEndTime={new Date('2026-02-22T10:00:00+09:00')}
				onComplete={vi.fn()}
				requestCandidates={requestCandidates}
				requestAssign={requestAssign}
			/>,
		);

		await userEvent.click(
			await screen.findByRole('button', { name: '山田太郎' }),
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'山田太郎さんへの日時変更に失敗しました。時間をおいて再度お試しください。',
			);
		});
	});
});
