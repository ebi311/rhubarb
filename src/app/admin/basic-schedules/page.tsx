import Link from 'next/link';
import { Suspense } from 'react';
import { BasicScheduleFilterBar } from './_components/BasicScheduleFilterBar';
import { BasicScheduleTable } from './_components/BasicScheduleTable';
import { fetchFilterOptions } from './fetchFilterOptions';
import { parseFiltersFromSearchParams } from './parseFiltersFromParams';

interface BasicScheduleListPageProps {
	searchParams:
		| Promise<Record<string, string | string[] | undefined>>
		| Record<string, string | string[] | undefined>;
}

const BasicScheduleListPage = async ({
	searchParams,
}: BasicScheduleListPageProps) => {
	const params = await searchParams;
	const filters = parseFiltersFromSearchParams(params);
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

			<div className="flex justify-end">
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
					<BasicScheduleTable filters={filters} />
				</Suspense>
			</div>
		</div>
	);
};

export default BasicScheduleListPage;
