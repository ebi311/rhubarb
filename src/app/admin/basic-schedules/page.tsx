import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { BasicScheduleFilterBar } from './_components/BasicScheduleFilterBar';
import { BasicScheduleGrid } from './_components/BasicScheduleGrid';
import { transformToGridViewModel } from './_components/BasicScheduleGrid/transformToGridViewModel';
import { BasicScheduleList } from './_components/BasicScheduleList';
import { BasicScheduleTable } from './_components/BasicScheduleTable';
import type { BasicScheduleViewModel } from './_components/BasicScheduleTable/types';
import {
	StaffBasicScheduleGrid,
	transformToStaffGridViewModel,
} from './_components/StaffBasicScheduleGrid';
import type { ViewMode } from './_components/ViewToggleButton';
import { ViewToggleButton } from './_components/ViewToggleButton';
import { fetchFilterOptions } from './fetchFilterOptions';
import { parseFiltersFromSearchParams } from './parseFiltersFromParams';

interface BasicScheduleListPageProps {
	searchParams:
		| Promise<Record<string, string | string[] | undefined>>
		| Record<string, string | string[] | undefined>;
}

/** 各表示モードのレンダリング関数マップ */
const viewRenderers: Record<
	ViewMode,
	(schedules: BasicScheduleViewModel[]) => ReactNode
> = {
	list: (schedules) => <BasicScheduleList schedules={schedules} />,
	grid: (schedules) => {
		const gridData = transformToGridViewModel(schedules);
		return <BasicScheduleGrid schedules={gridData} />;
	},
	'staff-grid': (schedules) => {
		const staffGridData = transformToStaffGridViewModel(schedules);
		return <StaffBasicScheduleGrid schedules={staffGridData} />;
	},
};

const BasicScheduleListPage = async ({
	searchParams,
}: BasicScheduleListPageProps) => {
	const params = await searchParams;
	const filters = parseFiltersFromSearchParams(params);
	const view = (params.view as ViewMode) || 'list';
	const { clients, serviceTypes } = await fetchFilterOptions();

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold tracking-widest text-primary uppercase">
					基本スケジュール
				</p>
				<h1 className="text-3xl font-bold">週次スケジュール一覧</h1>
				<p className="text-sm text-base-content/70">
					登録済みの基本スケジュールを確認できます。
				</p>
			</section>

			<div className="flex justify-end gap-2">
				<ViewToggleButton currentView={view} />
				<Link href="/admin/basic-schedules/new" className="btn btn-primary">
					新規登録
				</Link>
			</div>

			<div className="space-y-4">
				<BasicScheduleFilterBar clients={clients} serviceTypes={serviceTypes} />

				<Suspense
					fallback={
						<div className="space-y-2">
							<div className="h-12 w-full skeleton" />
							<div className="h-12 w-full skeleton" />
							<div className="h-12 w-full skeleton" />
						</div>
					}
				>
					<BasicScheduleTable filters={filters} render={viewRenderers[view]} />
				</Suspense>
			</div>
		</div>
	);
};

export default BasicScheduleListPage;
