import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
	EditableSchedule,
	ScheduleData,
} from '../ClientWeeklyScheduleEditor/types';
import { DayColumn } from './DayColumn';

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

describe('DayColumn', () => {
	it('曜日ラベルを表示する', () => {
		render(
			<DayColumn
				weekday="Mon"
				schedules={[]}
				onAddClick={() => {}}
				onCardClick={() => {}}
				onCardDelete={() => {}}
			/>,
		);

		expect(screen.getByText('月曜日')).toBeInTheDocument();
	});

	it('スケジュールがない場合は空の状態を表示する', () => {
		render(
			<DayColumn
				weekday="Mon"
				schedules={[]}
				onAddClick={() => {}}
				onCardClick={() => {}}
				onCardDelete={() => {}}
			/>,
		);

		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
	});

	it('スケジュールをカードで表示する', () => {
		const schedules = [
			createTestSchedule({ id: 'schedule-1' }),
			createTestSchedule({
				id: 'schedule-2',
				data: createTestScheduleData({
					startTime: { hour: 14, minute: 0 },
					endTime: { hour: 15, minute: 0 },
				}),
			}),
		];

		render(
			<DayColumn
				weekday="Mon"
				schedules={schedules}
				onAddClick={() => {}}
				onCardClick={() => {}}
				onCardDelete={() => {}}
			/>,
		);

		expect(screen.getAllByTestId('schedule-card')).toHaveLength(2);
	});

	it('追加ボタンをクリックすると onAddClick が呼ばれる', async () => {
		const user = userEvent.setup();
		const onAddClick = vi.fn();

		render(
			<DayColumn
				weekday="Wed"
				schedules={[]}
				onAddClick={onAddClick}
				onCardClick={() => {}}
				onCardDelete={() => {}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: /追加/ }));

		expect(onAddClick).toHaveBeenCalledWith('Wed');
	});

	it('カードをクリックすると onCardClick が呼ばれる', async () => {
		const user = userEvent.setup();
		const onCardClick = vi.fn();
		const schedule = createTestSchedule({ id: 'schedule-1' });

		render(
			<DayColumn
				weekday="Mon"
				schedules={[schedule]}
				onAddClick={() => {}}
				onCardClick={onCardClick}
				onCardDelete={() => {}}
			/>,
		);

		await user.click(screen.getByTestId('schedule-card'));

		expect(onCardClick).toHaveBeenCalledWith('schedule-1');
	});

	it('カードの削除ボタンをクリックすると onCardDelete が呼ばれる', async () => {
		const user = userEvent.setup();
		const onCardDelete = vi.fn();
		const schedule = createTestSchedule({ id: 'schedule-1' });

		render(
			<DayColumn
				weekday="Mon"
				schedules={[schedule]}
				onAddClick={() => {}}
				onCardClick={() => {}}
				onCardDelete={onCardDelete}
			/>,
		);

		const card = screen.getByTestId('schedule-card');
		await user.click(within(card).getByRole('button', { name: /削除/ }));

		expect(onCardDelete).toHaveBeenCalledWith('schedule-1');
	});

	describe('曜日ラベルの表示', () => {
		it.each([
			['Mon', '月曜日'],
			['Tue', '火曜日'],
			['Wed', '水曜日'],
			['Thu', '木曜日'],
			['Fri', '金曜日'],
			['Sat', '土曜日'],
			['Sun', '日曜日'],
		] as const)('%s を %s として表示する', (weekday, expectedLabel) => {
			render(
				<DayColumn
					weekday={weekday}
					schedules={[]}
					onAddClick={() => {}}
					onCardClick={() => {}}
					onCardDelete={() => {}}
				/>,
			);

			expect(screen.getByText(expectedLabel)).toBeInTheDocument();
		});
	});
});
