import { PageTitle } from '@/app/_components/Header/context';
import { formatJstDateString } from '@/utils/date';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { WeeklyScheduleContent } from './_components/WeeklyScheduleContent';
import { WeeklyScheduleSkeleton } from './_components/WeeklyScheduleSkeleton';
import { getMonday, parseSearchParams, type SearchParams } from './helpers';

interface WeeklySchedulesPageProps {
	searchParams: Promise<SearchParams>;
}

const WeeklySchedulesPage = async ({
	searchParams,
}: WeeklySchedulesPageProps) => {
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
		<>
			<PageTitle title="週間スケジュール管理" />
			<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
				<section className="space-y-2">
					<p className="text-sm text-base-content/70">
						週ごとのシフトを確認・生成できます。
					</p>
				</section>

				<Suspense fallback={<WeeklyScheduleSkeleton />}>
					<WeeklyScheduleContent weekStartDate={weekStartDate} />
				</Suspense>
			</div>
		</>
	);
};

export default WeeklySchedulesPage;
