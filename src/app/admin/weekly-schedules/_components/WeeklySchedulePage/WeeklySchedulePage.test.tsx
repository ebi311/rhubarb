import { TEST_IDS } from '@/test/helpers/testIds';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import {
	WeeklySchedulePage,
	type WeeklySchedulePageProps,
} from './WeeklySchedulePage';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		refresh: mockRefresh,
	}),
	useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock('@/app/actions/weeklySchedules', () => ({
	generateWeeklyShiftsAction: vi.fn().mockResolvedValue({
		data: { created: 5, skipped: 0 },
		error: null,
		status: 200,
	}),
}));

vi.mock('@/app/actions/shifts', () => ({
	validateStaffAvailabilityAction: vi.fn().mockResolvedValue({
		data: { available: true, conflictingShifts: [] },
		error: null,
		status: 200,
	}),
	updateShiftScheduleAction: vi.fn().mockResolvedValue({
		data: { shiftId: 'shift-1' },
		error: null,
		status: 200,
	}),
}));

vi.mock('../AdjustmentChatDialog', () => ({
	AdjustmentChatDialog: ({
		isOpen,
		shiftContext,
		onClose,
	}: {
		isOpen: boolean;
		shiftContext: {
			clientName: string;
			staffName?: string;
			date: string;
			startTime: string;
			endTime: string;
		};
		onClose: () => void;
	}) =>
		isOpen ? (
			<div role="dialog" aria-label="シフト調整チャット">
				<p>{shiftContext.clientName}</p>
				<p>{shiftContext.staffName}</p>
				<p>{`${shiftContext.date} ${shiftContext.startTime}〜${shiftContext.endTime}`}</p>
				<button type="button" onClick={onClose}>
					閉じる
				</button>
			</div>
		) : null,
}));

vi.mock('../FlexibleAdjustmentChatDialog', () => ({
	FlexibleAdjustmentChatDialog: ({
		isOpen,
		weekRange,
		onClose,
	}: {
		isOpen: boolean;
		weekRange: { startDate: string; endDate: string };
		onClose: () => void;
	}) => (
		<div
			data-testid="flexible-adjustment-chat-dialog"
			data-open={isOpen ? 'true' : 'false'}
		>
			<p>{weekRange.startDate + '〜' + weekRange.endDate}</p>
			<button type="button" onClick={onClose}>
				閉じる
			</button>
		</div>
	),
}));

describe('WeeklySchedulePage', () => {
	const weekStartDate = new Date('2026-01-19T00:00:00');

	const sampleShifts: ShiftDisplayRow[] = [
		{
			id: 'shift-1',
			date: new Date('2099-01-19T00:00:00'),
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
			clientId: TEST_IDS.CLIENT_1,
			clientName: '田中太郎',
			serviceTypeId: 'physical-care',
			staffId: TEST_IDS.STAFF_1,
			staffName: '山田花子',
			status: 'scheduled',
			isUnassigned: false,
		},
	];

	const defaultProps: WeeklySchedulePageProps = {
		weekStartDate,
		initialShifts: [],
		staffOptions: [],
		clientOptions: [
			{ id: TEST_IDS.CLIENT_1, name: '田中太郎' },
			{ id: TEST_IDS.CLIENT_2, name: '鈴木一郎' },
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParamsGet.mockImplementation((key: string) =>
			key === 'view' ? 'grid' : null,
		);
	});

	it('WeekSelectorが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(screen.getByText(/2026年01月19日/)).toBeInTheDocument();
	});

	it('GenerateButtonが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(
			screen.getByRole('button', { name: /シフトを生成/ }),
		).toBeInTheDocument();
	});

	it('AIアシスタントボタンが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(
			screen.getByRole('button', { name: 'AIアシスタント' }),
		).toBeInTheDocument();
	});

	it('シフトがある場合はShiftTableが表示される', () => {
		mockSearchParamsGet.mockImplementation((key: string) =>
			key === 'view' ? 'list' : null,
		);
		render(
			<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
		);

		expect(screen.getByText('田中太郎')).toBeInTheDocument();
		expect(screen.getByText('山田花子')).toBeInTheDocument();
	});

	it('シフトがない場合はEmptyStateが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(
			screen.getByText('この週のシフトはまだありません'),
		).toBeInTheDocument();
	});

	it('週を変更するとrouter.pushが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '前週' }));

		expect(mockPush).toHaveBeenCalledWith(
			'/admin/weekly-schedules?week=2026-01-12&view=grid',
		);
	});

	it('ビュー切替でrouter.pushに?view=が付いて呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: 'リスト表示' }));

		expect(mockPush).toHaveBeenCalledWith(
			'/admin/weekly-schedules?week=2026-01-19&view=list',
		);
	});

	it('EmptyStateから生成ボタンをクリックするとgenerateWeeklyShiftsActionが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(
			screen.getByRole('button', { name: '基本スケジュールから生成' }),
		);

		const { generateWeeklyShiftsAction } =
			await import('@/app/actions/weeklySchedules');
		expect(generateWeeklyShiftsAction).toHaveBeenCalledWith('2026-01-19');
	});

	it('生成完了後にrouter.refreshが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: /シフトを生成/ }));

		// Wait for async action to complete
		await vi.waitFor(() => {
			expect(mockRefresh).toHaveBeenCalled();
		});
	});

	describe('AdjustmentChatDialog 統合', () => {
		it('担当者変更ダイアログのAIに相談ボタンをクリックするとAdjustmentChatDialogが開く', async () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === 'view' ? 'list' : null,
			);
			const user = userEvent.setup();
			render(
				<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
			);

			await user.click(screen.getByRole('button', { name: '担当者を変更' }));
			await user.click(screen.getByRole('button', { name: 'AIに相談' }));

			expect(
				screen.getByRole('dialog', { name: /シフト調整チャット/ }),
			).toBeInTheDocument();
		});

		it('AIチャットは担当者変更ダイアログを閉じた後に開く', () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === 'view' ? 'list' : null,
			);
			vi.useFakeTimers();
			try {
				render(
					<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
				);

				fireEvent.click(screen.getByRole('button', { name: '担当者を変更' }));
				fireEvent.click(screen.getByRole('button', { name: 'AIに相談' }));

				expect(
					screen.queryByRole('heading', { name: '担当者を変更' }),
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole('dialog', { name: /シフト調整チャット/ }),
				).not.toBeInTheDocument();

				act(() => {
					vi.runAllTimers();
				});

				expect(
					screen.getByRole('dialog', { name: /シフト調整チャット/ }),
				).toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});

		it('AI相談後に別シフトの担当者変更ダイアログを開き直した場合、通常クローズでAIチャットは開かない', () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === 'view' ? 'list' : null,
			);
			vi.useFakeTimers();
			try {
				const secondShift: ShiftDisplayRow = {
					...sampleShifts[0],
					id: 'shift-2',
					clientId: TEST_IDS.CLIENT_2,
					clientName: '鈴木一郎',
				};

				render(
					<WeeklySchedulePage
						{...defaultProps}
						initialShifts={[...sampleShifts, secondShift]}
					/>,
				);

				const changeButtons = () =>
					screen.getAllByRole('button', { name: '担当者を変更' });

				fireEvent.click(changeButtons()[0]);

				act(() => {
					fireEvent.click(screen.getByRole('button', { name: 'AIに相談' }));
					fireEvent.click(changeButtons()[1]);
				});

				expect(
					screen.getByRole('heading', { name: '担当者を変更' }),
				).toBeInTheDocument();

				fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

				act(() => {
					vi.runAllTimers();
				});

				expect(
					screen.queryByRole('dialog', { name: /シフト調整チャット/ }),
				).not.toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});

		it('AIチャットには未保存編集ではなく初期シフトが渡される', async () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === 'view' ? 'list' : null,
			);
			const user = userEvent.setup();
			render(
				<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
			);

			await user.click(screen.getByRole('button', { name: '担当者を変更' }));

			await user.clear(screen.getByLabelText('開始'));
			await user.type(screen.getByLabelText('開始'), '13:00');
			await user.clear(screen.getByLabelText('終了'));
			await user.type(screen.getByLabelText('終了'), '14:00');

			await user.click(screen.getByRole('button', { name: 'AIに相談' }));

			const dialog = screen.getByRole('dialog', { name: /シフト調整チャット/ });
			expect(dialog).toHaveTextContent('田中太郎');
			expect(dialog).toHaveTextContent('山田花子');
			expect(dialog).toHaveTextContent('2099-01-19 09:00〜10:00');
			expect(dialog).not.toHaveTextContent('2099-01-19 13:00〜14:00');
		});

		it('AdjustmentChatDialogの閉じるボタンでダイアログが閉じる', async () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === 'view' ? 'list' : null,
			);
			const user = userEvent.setup();
			render(
				<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
			);

			await user.click(screen.getByRole('button', { name: '担当者を変更' }));
			await user.click(screen.getByRole('button', { name: 'AIに相談' }));
			expect(
				screen.getByRole('dialog', { name: /シフト調整チャット/ }),
			).toBeInTheDocument();

			const dialog = screen.getByRole('dialog', { name: /シフト調整チャット/ });
			const closeButton = dialog.querySelector('button');
			expect(closeButton).not.toBeNull();

			await user.click(closeButton!);

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	describe('FlexibleAdjustmentChatDialog 統合', () => {
		it('AIアシスタント Drawer は常時 mount され、isOpen と右余白だけを切り替える', async () => {
			const user = userEvent.setup();
			const { container } = render(
				<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
			);
			const pageRoot = container.firstElementChild;
			const drawer = screen.getByTestId('flexible-adjustment-chat-dialog');

			expect(pageRoot).not.toBeNull();
			expect(pageRoot).not.toHaveClass('lg:pr-[400px]');
			expect(drawer).toHaveAttribute('data-open', 'false');
			expect(drawer).toHaveTextContent('2026-01-19〜2026-01-25');

			await user.click(screen.getByRole('button', { name: 'AIアシスタント' }));

			expect(drawer).toHaveAttribute('data-open', 'true');
			expect(pageRoot).toHaveClass('lg:pr-[400px]');

			await user.click(screen.getByRole('button', { name: '閉じる' }));

			expect(drawer).toHaveAttribute('data-open', 'false');
			expect(pageRoot).not.toHaveClass('lg:pr-[400px]');

			await user.click(screen.getByRole('button', { name: 'AIアシスタント' }));

			expect(drawer).toHaveAttribute('data-open', 'true');
			expect(pageRoot).toHaveClass('lg:pr-[400px]');
		});
	});
});
