import {
	batchSaveBasicSchedulesAction,
	listBasicSchedulesAction,
} from '@/app/actions/basicSchedules';
import { getServiceUserByIdAction } from '@/app/actions/serviceUsers';
import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import {
	errorResult,
	type ActionResult,
} from '@/app/actions/utils/actionResult';
import type { BasicScheduleInput } from '@/models/basicScheduleActionSchemas';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
	ClientWeeklyScheduleEditor,
	type BatchSaveOperations,
} from './_components/ClientWeeklyScheduleEditor';
import type { InitialScheduleData } from './_components/ClientWeeklyScheduleEditor/types';

type ClientBatchEditPageProps = {
	params: Promise<{ clientId: string }>;
};

const safeData = <T,>(label: string, result: ActionResult<T[]>): T[] => {
	if (result.error) {
		console.warn(`[ClientBatchEditPage] ${label} fetch failed`, {
			error: result.error,
			status: result.status,
			details: result.details,
		});
		return [];
	}
	return result.data ?? [];
};

const fetchPageData = async (clientId: string) => {
	const [clientResult, schedulesResult, serviceTypesResult, staffsResult] =
		await Promise.all([
			getServiceUserByIdAction(clientId),
			listBasicSchedulesAction({ client_id: clientId }),
			listServiceTypesAction(),
			listStaffsAction(),
		]);

	if (clientResult.error || !clientResult.data) {
		return null;
	}

	return {
		client: clientResult.data,
		schedules: safeData('schedules', schedulesResult),
		serviceTypes: safeData('service types', serviceTypesResult),
		staffs: safeData('staffs', staffsResult),
	};
};

const toInitialScheduleData = (
	schedules: NonNullable<
		Awaited<ReturnType<typeof fetchPageData>>
	>['schedules'],
): InitialScheduleData[] => {
	return schedules.map((schedule) => ({
		id: schedule.id,
		data: {
			weekday: schedule.weekday,
			serviceTypeId: schedule.service_type_id,
			staffIds: schedule.staffs.map((s) => s.id),
			staffNames: schedule.staffs.map((s) => s.name),
			startTime: schedule.start_time,
			endTime: schedule.end_time,
			note: schedule.note ?? null,
		},
	}));
};

const ClientBatchEditPage = async ({ params }: ClientBatchEditPageProps) => {
	const { clientId } = await params;
	const pageData = await fetchPageData(clientId);

	if (!pageData) {
		notFound();
	}

	const { client, schedules, serviceTypes, staffs } = pageData;

	const initialSchedules = toInitialScheduleData(schedules);

	const serviceTypeOptions = serviceTypes.map((st) => ({
		id: st.id,
		name: st.name,
	}));

	const staffOptions = staffs.map((s) => ({
		id: s.id,
		name: s.name,
		role: s.role,
		serviceTypeIds: s.service_type_ids,
		note: s.note,
	}));

	const handleSave = async (
		operations: BatchSaveOperations,
	): Promise<ActionResult<unknown>> => {
		'use server';

		const apiOperations = {
			create: operations.create.map(
				(data): BasicScheduleInput => ({
					client_id: clientId,
					service_type_id: data.serviceTypeId,
					staff_ids: data.staffIds,
					weekday: data.weekday,
					start_time: data.startTime,
					end_time: data.endTime,
					note: data.note,
				}),
			),
			update: operations.update.map(({ id, data }) => ({
				id,
				input: {
					client_id: clientId,
					service_type_id: data.serviceTypeId,
					staff_ids: data.staffIds,
					weekday: data.weekday,
					start_time: data.startTime,
					end_time: data.endTime,
					note: data.note,
				} satisfies BasicScheduleInput,
			})),
			delete: operations.delete,
		};

		try {
			const result = await batchSaveBasicSchedulesAction(
				clientId,
				apiOperations,
			);

			// エラー（部分失敗含む）の場合は例外を投げず、結果をそのまま返して
			// クライアント側で details を含めたハンドリングを行う
			if (result.error) {
				return result;
			}

			// 正常完了時のみ一覧画面へリダイレクト
			redirect('/admin/basic-schedules');
		} catch (e) {
			// redirect() は内部的に例外をスローするため、ここで再スロー
			throw e;
		}

		// この行は redirect() の後に到達しないが、型の整合性のために必要
		return errorResult('Unexpected error', 500);
	};

	return (
		<div className="container mx-auto space-y-4 p-4">
			<div className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link href="/admin/basic-schedules">基本スケジュール</Link>
					</li>
					<li>{client.name} - 一括編集</li>
				</ul>
			</div>

			<ClientWeeklyScheduleEditor
				clientId={client.id}
				clientName={client.name}
				initialSchedules={initialSchedules}
				serviceTypeOptions={serviceTypeOptions}
				staffOptions={staffOptions}
				onSave={handleSave}
			/>
		</div>
	);
};

export default ClientBatchEditPage;
