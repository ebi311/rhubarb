import { PageTitle } from '@/app/_components/Header/context';
import { getServiceUsersAction } from '@/app/actions/serviceUsers';
import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { ServiceUser } from '@/models/serviceUser';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ServiceTypeOption } from '../../staffs/_types';
import { BasicScheduleForm } from '../_components/BasicScheduleForm';

const safeData = <T,>(label: string, result: ActionResult<T[]>): T[] => {
	if (result.error) {
		console.warn(`[BasicSchedulesPage] ${label} fetch failed`, {
			error: result.error,
			status: result.status,
			details: result.details,
		});
		return [];
	}
	return result.data ?? [];
};

const fetchPageData = async () => {
	const [serviceUsersResult, serviceTypesResult, staffsResult] =
		await Promise.all([
			getServiceUsersAction('active'),
			listServiceTypesAction(),
			listStaffsAction(),
		]);

	return {
		serviceUsers: safeData<ServiceUser>('service users', serviceUsersResult),
		serviceTypes: safeData<ServiceTypeOption>(
			'service types',
			serviceTypesResult,
		),
		staffs: safeData<StaffRecord>('staffs', staffsResult),
	};
};

const BasicSchedulesPage = async () => {
	const { serviceUsers, serviceTypes, staffs } = await fetchPageData();

	return (
		<>
			<PageTitle title="基本スケジュール登録" />
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
				<p className="text-sm text-base-content/70">
					契約中の利用者について、曜日と時間帯、サービス区分、デフォルト担当者を設定します。
				</p>
				<BasicScheduleForm
					serviceUsers={serviceUsers}
					serviceTypes={serviceTypes}
					staffs={staffs}
				/>
			</div>
		</>
	);
};

export default BasicSchedulesPage;
