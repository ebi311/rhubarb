import { formatJstDateString } from '@/utils/date';
import { redirect } from 'next/navigation';

import { getMonday, parseSearchParams, type SearchParams } from './helpers';

interface WeeklySchedulesPageProps {
	searchParams: Promise<SearchParams>;
}

const WeeklySchedulesPage = async ({ searchParams }: WeeklySchedulesPageProps) => {
	const params = await searchParams;
	const parsed = parseSearchParams(params);

	// week パラメータが未指定または無効な場合
	if (!parsed.isValid) {
		let mondayDate: Date;

		if (parsed.error === 'not_monday' && parsed.weekStartDate) {
			// 月曜日以外の場合は、その週の月曜日を計算
			mondayDate = getMonday(parsed.weekStartDate);
		} else {
			// 未指定または無効な日付の場合は今週の月曜日
			mondayDate = getMonday(new Date());
		}

		const weekStr = formatJstDateString(mondayDate);
		redirect(`/admin/weekly-schedules?week=${weekStr}`);
	}

	const weekStartDate = parsed.weekStartDate!;

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold tracking-widest text-primary uppercase">シフト管理</p>
				<h1 className="text-3xl font-bold">週間スケジュール</h1>
				<p className="text-sm text-base-content/70">週ごとのシフトを確認・生成できます。</p>
			</section>

			{/* TODO: WeekSelector, GenerateButton, ShiftTable を追加 */}
			<div className="rounded-lg border border-base-300 p-4">
				<p className="text-base-content/70">選択中の週: {formatJstDateString(weekStartDate)}</p>
			</div>
		</div>
	);
};

export default WeeklySchedulesPage;
