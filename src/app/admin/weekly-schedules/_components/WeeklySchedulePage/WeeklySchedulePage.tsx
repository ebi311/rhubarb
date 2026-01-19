'use client';

import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';
import { formatJstDateString } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { EmptyState } from '../EmptyState';
import { GenerateButton, type GenerateResult } from '../GenerateButton';
import { ShiftTable, type ShiftDisplayRow } from '../ShiftTable';
import { WeekSelector } from '../WeekSelector';

export interface WeeklySchedulePageProps {
	weekStartDate: Date;
	initialShifts: ShiftDisplayRow[];
}

export const WeeklySchedulePage = ({ weekStartDate, initialShifts }: WeeklySchedulePageProps) => {
	const router = useRouter();

	const handleWeekChange = (date: Date) => {
		const weekParam = formatJstDateString(date);
		router.push(`/admin/weekly-schedules?week=${weekParam}`);
	};

	const handleGenerated = (_result: GenerateResult) => {
		router.refresh();
	};

	const handleGenerateFromEmpty = async () => {
		const result = await generateWeeklyShiftsAction(formatJstDateString(weekStartDate));
		if (result.data) {
			router.refresh();
		}
	};

	const hasShifts = initialShifts.length > 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<WeekSelector currentWeek={weekStartDate} onWeekChange={handleWeekChange} />
				<GenerateButton
					weekStartDate={weekStartDate}
					onGenerated={handleGenerated}
					disabled={false}
				/>
			</div>

			{hasShifts ? (
				<ShiftTable shifts={initialShifts} />
			) : (
				<EmptyState weekStartDate={weekStartDate} onGenerate={handleGenerateFromEmpty} />
			)}
		</div>
	);
};
