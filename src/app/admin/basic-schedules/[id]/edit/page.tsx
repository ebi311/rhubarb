import { getBasicScheduleByIdAction } from '@/app/actions/basicSchedules';
import { getServiceUsersAction } from '@/app/actions/serviceUsers';
import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { notFound } from 'next/navigation';
import type { ServiceTypeOption } from '../../../staffs/_types';
import {
	BasicScheduleForm,
	toFormInitialValues,
} from '../../_components/BasicScheduleForm';

type EditBasicSchedulePageProps = {
	params: Promise<{ id: string }>;
};

const safeData = <T,>(label: string, result: ActionResult<T[]>): T[] => {
	if (result.error) {
		console.warn(`[EditBasicSchedulePage] ${label} fetch failed`, {
			error: result.error,
			status: result.status,
			details: result.details,
		});
		return [];
	}
	return result.data ?? [];
};

const fetchPageData = async (scheduleId: string) => {
	const [scheduleResult, serviceUsersResult, serviceTypesResult, staffsResult] =
		await Promise.all([
			getBasicScheduleByIdAction(scheduleId),
			getServiceUsersAction('active'),
			listServiceTypesAction(),
			listStaffsAction(),
		]);

	if (scheduleResult.error || !scheduleResult.data) {
		return null;
	}

	return {
		schedule: scheduleResult.data,
		serviceUsers: safeData<ServiceUser>('service users', serviceUsersResult),
		serviceTypes: safeData<ServiceTypeOption>(
			'service types',
			serviceTypesResult,
		),
		staffs: safeData<StaffRecord>('staffs', staffsResult),
	};
};

const EditBasicSchedulePage = async ({
	params,
}: EditBasicSchedulePageProps) => {
	const { id } = await params;
	const pageData = await fetchPageData(id);

	if (!pageData) {
		notFound();
	}

	const { schedule, serviceUsers, serviceTypes, staffs } = pageData;
	const initialValues = toFormInitialValues(schedule);

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold tracking-widest text-primary uppercase">
					基本スケジュール
				</p>
				<h1 className="text-3xl font-bold">スケジュールの編集</h1>
				<p className="text-sm text-base-content/70">
					{schedule.client.name} のスケジュール内容を編集できます。
				</p>
			</section>
			<BasicScheduleForm
				serviceUsers={serviceUsers}
				serviceTypes={serviceTypes}
				staffs={staffs}
				initialValues={initialValues}
				mode="edit"
				scheduleId={id}
			/>
		</div>
	);
};

export default EditBasicSchedulePage;
