'use client';

import { addJstDays, dateJst, parseJstDateString } from '@/utils/date';
import dayjs from 'dayjs';

export interface WeekSelectorProps {
	currentWeek: Date;
	onWeekChange: (date: Date) => void;
}

export const WeekSelector = ({ currentWeek, onWeekChange }: WeekSelectorProps) => {
	const startDate = dateJst(currentWeek);
	const endDate = startDate.add(6, 'day');

	const formatDate = (d: typeof startDate) => {
		return `${d.format('YYYY年MM月DD日')}`;
	};

	const formatEndDate = (d: typeof endDate) => {
		return `${d.format('MM月DD日')}`;
	};

	// input type="week" 用の値（YYYY-Www 形式）
	const weekInputValue = startDate.format('GGGG-[W]WW');

	const handlePrevWeek = () => {
		onWeekChange(addJstDays(currentWeek, -7));
	};

	const handleNextWeek = () => {
		onWeekChange(addJstDays(currentWeek, 7));
	};

	const handleWeekInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value; // YYYY-Www 形式
		if (!value) return;

		// YYYY-Www を月曜日の日付に変換
		const match = value.match(/^(\d{4})-W(\d{2})$/);
		if (match) {
			const year = parseInt(match[1], 10);
			const week = parseInt(match[2], 10);
			// ISO週番号から月曜日を計算
			// ISO週番号1は、1月4日を含む週
			const jan4 = dayjs(`${year}-01-04`);
			const jan4DayOfWeek = jan4.day() || 7; // 日曜日は0なので7に変換
			const firstMonday = jan4.subtract(jan4DayOfWeek - 1, 'day');
			const monday = firstMonday.add((week - 1) * 7, 'day');
			onWeekChange(parseJstDateString(monday.format('YYYY-MM-DD')));
		}
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				className="btn btn-outline btn-sm"
				onClick={handlePrevWeek}
				aria-label="前週"
			>
				◀ 前週
			</button>

			<span className="min-w-[220px] text-center font-medium">
				{formatDate(startDate)}〜{formatEndDate(endDate)}
			</span>

			<button
				type="button"
				className="btn btn-outline btn-sm"
				onClick={handleNextWeek}
				aria-label="次週"
			>
				次週 ▶
			</button>

			<input
				type="week"
				className="input-bordered input input-sm ml-2"
				value={weekInputValue}
				onChange={handleWeekInputChange}
				aria-label="週を選択"
			/>
		</div>
	);
};
