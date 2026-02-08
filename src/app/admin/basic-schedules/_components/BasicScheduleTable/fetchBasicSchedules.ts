import { listBasicSchedulesAction } from '@/app/actions/basicSchedules';
import { timeObjectToString } from '@/utils/date';
import { createSupabaseClient } from '@/utils/supabase/server';
import type { BasicScheduleFilterState } from '../BasicScheduleFilterBar/types';
import type { BasicScheduleViewModel } from './types';

/** サーバーサイドで基本スケジュールを取得する */
export const fetchBasicSchedules = async (
	filters: BasicScheduleFilterState,
): Promise<BasicScheduleViewModel[]> => {
	const supabase = await createSupabaseClient();

	// 認証チェック
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return [];

	const listQueryResult = await listBasicSchedulesAction({
		client_id: filters.clientId,
		service_type_id: filters.serviceTypeId || undefined,
		weekday: filters.weekday || undefined,
	});

	const { data: schedules, error } = await listQueryResult;
	if (error) {
		console.error('Failed to fetch basic schedules:', error);
		return [];
	}

	return (
		schedules?.map((schedule) => ({
			id: schedule.id,
			clientId: schedule.client.id,
			clientName: schedule.client.name,
			note: schedule.note ?? '',
			serviceTypeId: schedule.service_type_id,
			weekday: schedule.weekday,
			timeRange: `${timeObjectToString(schedule.start_time)} - ${timeObjectToString(schedule.end_time)}`,
			staffNames: schedule.staffs.map((s) => s.name),
		})) || []
	);
};
