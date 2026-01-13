import { ServiceTypeIdSchema } from '@/models/valueObjects/serviceTypeId';
import { createSupabaseClient } from '@/utils/supabase/server';
import type { BasicScheduleFilterState } from '../BasicScheduleFilterBar/types';
import type { BasicScheduleViewModel } from './types';

const buildBasicSchedulesQuery = async (
	supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
	filters: BasicScheduleFilterState,
) => {
	let query = supabase
		.from('basic_schedules')
		.select(
			`
			id,
			day_of_week,
			start_time,
			end_time,
			note,
			clients:client_id (name),
			service_types:service_type_id (id)
		`,
		)
		.is('deleted_at', null)
		.order('day_of_week', { ascending: true })
		.order('start_time', { ascending: true });

	// フィルタ適用
	const filterMap = [
		{ condition: filters.weekday, column: 'day_of_week', value: filters.weekday },
		{ condition: filters.clientId, column: 'client_id', value: filters.clientId },
		{ condition: filters.serviceTypeId, column: 'service_type_id', value: filters.serviceTypeId },
	];

	for (const filter of filterMap) {
		if (filter.condition && filter.value) {
			query = query.eq(filter.column, filter.value);
		}
	}

	return query;
};

const fetchScheduleStaffMap = async (
	supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
	scheduleIds: string[],
) => {
	if (!scheduleIds.length) return new Map<string, string[]>();
	const { data: assignments, error } = await supabase
		.from('basic_schedule_staff_assignments')
		.select(
			`
			basic_schedule_id,
			staffs:staff_id (name)
		`,
		)
		.in('basic_schedule_id', scheduleIds);

	if (error) {
		console.error('Failed to fetch schedule staff assignments:', error);
		return new Map<string, string[]>();
	}

	const staffMap = new Map<string, string[]>();
	assignments?.forEach((assignment) => {
		const scheduleId = assignment.basic_schedule_id;
		const staffName = (assignment.staffs as { name: string } | null)?.name;
		if (!staffName) return;
		if (!staffMap.has(scheduleId)) {
			staffMap.set(scheduleId, []);
		}
		staffMap.get(scheduleId)!.push(staffName);
	});

	return staffMap;
};

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

	const query = await buildBasicSchedulesQuery(supabase, filters);

	const { data: schedules, error } = await query;
	if (error) {
		console.error('Failed to fetch basic schedules:', error);
		return [];
	}

	// 各スケジュールのスタッフ情報を取得
	const scheduleIds = schedules.map((s) => s.id as string);
	const staffMap = await fetchScheduleStaffMap(supabase, scheduleIds);

	// ViewModelに変換
	return schedules.map((schedule) => ({
		id: schedule.id,
		clientName: schedule.clients?.name ?? '不明',
		serviceTypeId: ServiceTypeIdSchema.parse(schedule.service_types.id),
		weekday: schedule.day_of_week,
		timeRange: `${schedule.start_time} - ${schedule.end_time}`,
		staffNames: staffMap.get(schedule.id) ?? [],
		note: schedule.note,
	}));
};
