import { PageTitle } from '@/app/_components/Header/context';
import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import Link from 'next/link';
import { Suspense } from 'react';
import { BasicScheduleContent } from './_components/BasicScheduleContent';
import { BasicScheduleFilterBar } from './_components/BasicScheduleFilterBar';
import { BasicScheduleTable } from './_components/BasicScheduleTable';
import { ScheduleEditFormModalProps } from './clients/[clientId]/edit/_components/ScheduleEditFormModal';
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
	// const { clients, serviceTypes } = await fetchFilterOptions();
	const [{ clients, serviceTypes }, serviceTypesResult, staffsResult] =
		await Promise.all([
			fetchFilterOptions(),
			listServiceTypesAction(),
			listStaffsAction(),
		]);

	const serviceTypeOptions: ScheduleEditFormModalProps['serviceTypeOptions'] =
		serviceTypesResult.data?.map((st) => ({
			id: st.id,
			name: st.name,
		})) ?? [];

	const staffOptions: ScheduleEditFormModalProps['staffOptions'] =
		staffsResult.data?.map((st) => ({
			id: st.id,
			name: st.name,
			role: st.role,
			serviceTypeIds: st.service_type_ids,
			note: st.note,
		})) ?? [];

	return (
		<>
			<PageTitle title="基本スケジュール管理" />
			<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
				<section className="space-y-2">
					<p className="text-sm text-base-content/70">
						登録済みの基本スケジュールを確認・編集できます。
					</p>
				</section>

				<div className="flex justify-end gap-2">
					<Link href="/admin/basic-schedules/new" className="btn btn-primary">
						新規登録
					</Link>
				</div>

				<div className="space-y-4">
					<BasicScheduleFilterBar
						clients={clients}
						serviceTypes={serviceTypes}
					/>

					<Suspense
						fallback={
							<div className="space-y-2">
								<div className="h-12 w-full skeleton" />
								<div className="h-12 w-full skeleton" />
								<div className="h-12 w-full skeleton" />
							</div>
						}
					>
						<BasicScheduleTable
							filters={filters}
							render={(schedules) => (
								<BasicScheduleContent
									schedules={schedules}
									serviceTypeOptions={serviceTypeOptions}
									staffOptions={staffOptions}
								/>
							)}
						/>
					</Suspense>
				</div>
			</div>
		</>
	);
};

export default BasicScheduleListPage;
