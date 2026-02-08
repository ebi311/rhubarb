import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import type { EditableSchedule } from '../ClientWeeklyScheduleEditor/types';
import { ScheduleCard } from '../ScheduleCard';

interface DayColumnProps {
	weekday: DayOfWeek;
	schedules: EditableSchedule[];
	onAddClick: (weekday: DayOfWeek) => void;
	onCardClick: (id: string) => void;
	onCardDelete: (id: string) => void;
}

export const DayColumn = ({
	weekday,
	schedules,
	onAddClick,
	onCardClick,
	onCardDelete,
}: DayColumnProps) => {
	const handleAddClick = () => {
		onAddClick(weekday);
	};

	return (
		<div className="flex min-h-[200px] flex-col bg-base-100">
			{/* 曜日ヘッダー */}
			<div className="border-b border-base-300 bg-base-200 p-2 text-center font-semibold">
				{WEEKDAY_FULL_LABELS[weekday]}
			</div>

			{/* スケジュールカード一覧 */}
			<div className="flex-1 space-y-2 p-2">
				{schedules.length === 0 ? (
					<div
						data-testid="empty-state"
						className="flex h-16 items-center justify-center rounded bg-base-200/50 text-sm text-base-content/40"
					>
						予定なし
					</div>
				) : (
					schedules.map((schedule) => (
						<ScheduleCard
							key={schedule.id}
							schedule={schedule}
							onClick={onCardClick}
							onDelete={onCardDelete}
						/>
					))
				)}
			</div>

			{/* 追加ボタン */}
			<div className="border-t border-base-300 p-2">
				<button
					type="button"
					className="btn btn-block btn-ghost btn-sm"
					onClick={handleAddClick}
					aria-label={`${WEEKDAY_FULL_LABELS[weekday]}に追加`}
				>
					＋ 追加
				</button>
			</div>
		</div>
	);
};
