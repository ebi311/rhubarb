import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
	EditableSchedule,
	ScheduleData,
} from '../ClientWeeklyScheduleEditor/types';
import { ScheduleCard } from './ScheduleCard';

const createTestScheduleData = (
	overrides: Partial<ScheduleData> = {},
): ScheduleData => ({
	weekday: 'Mon',
	serviceTypeId: 'life-support',
	staffIds: ['staff-1'],
	staffNames: ['山田太郎'],
	startTime: { hour: 9, minute: 0 },
	endTime: { hour: 10, minute: 0 },
	note: null,
	...overrides,
});

const createTestSchedule = (
	overrides: Partial<EditableSchedule> = {},
): EditableSchedule => ({
	id: 'test-id-1',
	originalId: 'test-id-1',
	status: 'unchanged',
	data: createTestScheduleData(),
	...overrides,
});

describe('ScheduleCard', () => {
	it('時間帯を表示する', () => {
		const schedule = createTestSchedule({
			data: createTestScheduleData({
				startTime: { hour: 9, minute: 30 },
				endTime: { hour: 11, minute: 0 },
			}),
		});

		render(
			<ScheduleCard
				schedule={schedule}
				onClick={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('09:30 - 11:00')).toBeInTheDocument();
	});

	it('担当者名を表示する', () => {
		const schedule = createTestSchedule({
			data: createTestScheduleData({
				staffNames: ['山田太郎', '鈴木花子'],
			}),
		});

		render(
			<ScheduleCard
				schedule={schedule}
				onClick={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('山田太郎, 鈴木花子')).toBeInTheDocument();
	});

	it('担当者がいない場合は「未設定」を表示する', () => {
		const schedule = createTestSchedule({
			data: createTestScheduleData({
				staffIds: [],
				staffNames: [],
			}),
		});

		render(
			<ScheduleCard
				schedule={schedule}
				onClick={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('(未設定)')).toBeInTheDocument();
	});

	describe('ステータスインジケーター', () => {
		it('unchanged 状態ではバッジを表示しない', () => {
			const schedule = createTestSchedule({ status: 'unchanged' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.queryByRole('status')).not.toBeInTheDocument();
		});

		it('new 状態では「新規」バッジを表示する', () => {
			const schedule = createTestSchedule({ status: 'new' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByRole('status')).toHaveTextContent('新規');
			expect(screen.getByRole('status')).toHaveClass('badge-success');
		});

		it('modified 状態では「変更」バッジを表示する', () => {
			const schedule = createTestSchedule({ status: 'modified' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByRole('status')).toHaveTextContent('変更');
			expect(screen.getByRole('status')).toHaveClass('badge-warning');
		});

		it('deleted 状態では「削除」バッジと取り消し線を表示する', () => {
			const schedule = createTestSchedule({ status: 'deleted' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByRole('status')).toHaveTextContent('削除');
			expect(screen.getByRole('status')).toHaveClass('badge-error');
			// カード全体に取り消し線
			expect(screen.getByTestId('schedule-card')).toHaveClass('line-through');
		});
	});

	describe('インタラクション', () => {
		it('カードをクリックすると onClick が呼ばれる', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();
			const schedule = createTestSchedule();

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={onClick}
					onDelete={() => {}}
				/>,
			);

			await user.click(screen.getByTestId('schedule-card'));

			expect(onClick).toHaveBeenCalledWith(schedule.id);
		});

		it('削除ボタンをクリックすると onDelete が呼ばれる', async () => {
			const user = userEvent.setup();
			const onDelete = vi.fn();
			const schedule = createTestSchedule();

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={onDelete}
				/>,
			);

			await user.click(screen.getByRole('button', { name: /削除/ }));

			expect(onDelete).toHaveBeenCalledWith(schedule.id);
		});

		it('deleted 状態では削除ボタンが「復元」になる', async () => {
			const onDelete = vi.fn();
			const schedule = createTestSchedule({ status: 'deleted' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={onDelete}
				/>,
			);

			expect(screen.getByRole('button', { name: /復元/ })).toBeInTheDocument();
		});

		it('deleted 状態のカードはクリックしても onClick が呼ばれない', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();
			const schedule = createTestSchedule({ status: 'deleted' });

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={onClick}
					onDelete={() => {}}
				/>,
			);

			await user.click(screen.getByTestId('schedule-card'));

			expect(onClick).not.toHaveBeenCalled();
		});
	});

	describe('サービス区分による背景色', () => {
		it('life-support は緑系の背景', () => {
			const schedule = createTestSchedule({
				data: createTestScheduleData({ serviceTypeId: 'life-support' }),
			});

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByTestId('schedule-card')).toHaveClass('bg-emerald-500');
		});

		it('physical-care は青系の背景', () => {
			const schedule = createTestSchedule({
				data: createTestScheduleData({ serviceTypeId: 'physical-care' }),
			});

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByTestId('schedule-card')).toHaveClass('bg-blue-500');
		});

		it('commute-support は紫系の背景', () => {
			const schedule = createTestSchedule({
				data: createTestScheduleData({ serviceTypeId: 'commute-support' }),
			});

			render(
				<ScheduleCard
					schedule={schedule}
					onClick={() => {}}
					onDelete={() => {}}
				/>,
			);

			expect(screen.getByTestId('schedule-card')).toHaveClass('bg-violet-500');
		});
	});
});
