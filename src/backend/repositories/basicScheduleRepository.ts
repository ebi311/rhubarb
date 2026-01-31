import { Database } from '@/backend/types/supabase';
import {
	BasicSchedule,
	BasicScheduleWithStaff,
	BasicScheduleWithStaffSchema,
} from '@/models/basicSchedule';
import { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { timeToMinutes } from '@/models/valueObjects/time';
import { parseTimeString, timeObjectToStringWithTimezone } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';

type BasicScheduleRow = Database['public']['Tables']['basic_schedules']['Row'];
type BasicScheduleInsert =
	Database['public']['Tables']['basic_schedules']['Insert'];
type BasicScheduleJoinedRow = BasicScheduleRow & {
	basic_schedule_staff_assignments?: { staffs: { id: string; name: string } }[];
	clients: { id: string; office_id: string; name: string };
};

export class BasicScheduleRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	private toDomain(row: BasicScheduleJoinedRow): BasicScheduleWithStaff {
		return BasicScheduleWithStaffSchema.parse({
			...row,
			time: {
				start: parseTimeString(row.start_time),
				end: parseTimeString(row.end_time),
			},
			note: row.note ?? null,
			assignedStaffs:
				row.basic_schedule_staff_assignments?.map((assignment) => ({
					id: assignment.staffs.id,
					name: assignment.staffs.name,
				})) ?? [],
			clients: {
				id: row.clients.id,
				name: row.clients.name,
			},
		});
	}

	private toDB(entity: BasicSchedule): BasicScheduleInsert {
		return {
			id: entity.id,
			client_id: entity.client_id,
			service_type_id: entity.service_type_id,
			day_of_week: entity.day_of_week,
			start_time: timeObjectToStringWithTimezone(entity.time.start),
			end_time: timeObjectToStringWithTimezone(entity.time.end),
			note: entity.note ?? null,
			created_at: entity.created_at.toISOString(),
			updated_at: entity.updated_at.toISOString(),
			deleted_at: entity.deleted_at?.toISOString() ?? null,
		};
	}

	private async replaceAssignments(
		scheduleId: string,
		staffIds: string[],
	): Promise<void> {
		const { error: deleteError } = await this.supabase
			.from('basic_schedule_staff_assignments')
			.delete()
			.eq('basic_schedule_id', scheduleId);
		if (deleteError) throw deleteError;

		if (staffIds.length === 0) return;

		const rows = staffIds.map((staffId) => ({
			basic_schedule_id: scheduleId,
			staff_id: staffId,
		}));

		const { error: insertError } = await this.supabase
			.from('basic_schedule_staff_assignments')
			.insert(rows);
		if (insertError) throw insertError;
	}

	async list(filters: {
		officeId?: string;
		weekday?: DayOfWeek;
		client_id?: string;
		service_type_id?: string;
		includeDeleted?: boolean;
	}): Promise<BasicScheduleWithStaff[]> {
		// officeId フィルタ対応: clients テーブルを join して office_id でフィルタ
		let query = this.supabase
			.from('basic_schedules')
			.select(
				'*, basic_schedule_staff_assignments(staffs(id, name)), clients!inner(id, office_id, name)',
			);
		if (filters.officeId)
			query = query.eq('clients.office_id', filters.officeId);
		if (filters.weekday) query = query.eq('day_of_week', filters.weekday);
		if (filters.client_id) query = query.eq('client_id', filters.client_id);
		if (filters.service_type_id)
			query = query.eq('service_type_id', filters.service_type_id);
		if (!filters.includeDeleted) query = query.is('deleted_at', null);

		const { data, error } = await query
			.order('day_of_week', { ascending: true })
			.order('start_time', { ascending: true });
		if (error) throw error;
		console.dir({ data }, { depth: null, colors: true });
		return (data ?? []).map((row) =>
			this.toDomain(row as BasicScheduleJoinedRow),
		);
	}

	async findById(id: string): Promise<BasicScheduleWithStaff | null> {
		const { data, error } = await this.supabase
			.from('basic_schedules')
			.select(
				'*, basic_schedule_staff_assignments(staffs(id, name)), clients!inner(id, office_id, name)',
			)
			.eq('id', id)
			.maybeSingle();

		if (error) throw error;
		if (!data) return null;

		return this.toDomain(data as BasicScheduleJoinedRow);
	}

	async create(schedule: BasicSchedule, staffIds: string[]): Promise<void> {
		const dbData = this.toDB(schedule);
		const { error } = await this.supabase
			.from('basic_schedules')
			.insert(dbData);
		if (error) throw error;
		await this.replaceAssignments(schedule.id, staffIds);
	}

	async update(schedule: BasicSchedule, staffIds: string[]): Promise<void> {
		const dbData = this.toDB(schedule);
		const { error } = await this.supabase
			.from('basic_schedules')
			.update(dbData)
			.eq('id', schedule.id);
		if (error) throw error;
		await this.replaceAssignments(schedule.id, staffIds);
	}

	async softDelete(id: string, deletedAt: Date): Promise<void> {
		const { error } = await this.supabase
			.from('basic_schedules')
			.update({ deleted_at: deletedAt.toISOString() })
			.eq('id', id);
		if (error) throw error;
	}

	async findOverlaps(params: {
		staff_ids: string[];
		weekday: DayOfWeek;
		start_time: string;
		end_time: string;
		excludeId?: string;
	}): Promise<BasicScheduleWithStaff[]> {
		if (params.staff_ids.length === 0) return [];

		const { data: assignmentRows, error: assignmentError } = await this.supabase
			.from('basic_schedule_staff_assignments')
			.select('basic_schedule_id')
			.in('staff_id', params.staff_ids);

		if (assignmentError) throw assignmentError;

		const scheduleIds = new Set(
			(assignmentRows ?? [])
				.map((row) => row.basic_schedule_id)
				.filter((id) => Boolean(id)),
		);

		if (params.excludeId) scheduleIds.delete(params.excludeId);
		if (scheduleIds.size === 0) return [];

		const { data: schedules, error } = await this.supabase
			.from('basic_schedules')
			.select(
				'*, basic_schedule_staff_assignments(staffs(id, name)), clients!inner(id, office_id, name)',
			)
			.in('id', Array.from(scheduleIds))
			.eq('day_of_week', params.weekday)
			.is('deleted_at', null);

		if (error) throw error;

		const targetStart =
			parseInt(params.start_time.slice(0, 2), 10) * 60 +
			parseInt(params.start_time.slice(2, 4), 10);
		const targetEnd =
			parseInt(params.end_time.slice(0, 2), 10) * 60 +
			parseInt(params.end_time.slice(2, 4), 10);

		return (schedules ?? [])
			.map((row) => this.toDomain(row as BasicScheduleJoinedRow))
			.filter((schedule) => {
				const start = timeToMinutes(schedule.time.start);
				const end = timeToMinutes(schedule.time.end);
				return targetStart < end && start < targetEnd;
			});
	}
}
