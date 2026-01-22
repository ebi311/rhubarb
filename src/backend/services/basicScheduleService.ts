import { BasicScheduleRepository } from '@/backend/repositories/basicScheduleRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { BasicSchedule, BasicScheduleWithStaff } from '@/models/basicSchedule';
import {
	BasicScheduleInput,
	BasicScheduleInputSchema,
	BasicScheduleRecord,
} from '@/models/basicScheduleActionSchemas';
import { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { formatTime } from '@/models/valueObjects/time';
import { SupabaseClient } from '@supabase/supabase-js';

export class ServiceError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

export class BasicScheduleService {
	private basicScheduleRepository: BasicScheduleRepository;
	private staffRepository: StaffRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options?: {
			basicScheduleRepository?: BasicScheduleRepository;
			staffRepository?: StaffRepository;
		},
	) {
		this.basicScheduleRepository =
			options?.basicScheduleRepository ?? new BasicScheduleRepository(supabase);
		this.staffRepository =
			options?.staffRepository ?? new StaffRepository(supabase);
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	private async assertClientActive(clientId: string, officeId: string) {
		const { data, error } = await this.supabase
			.from('clients')
			.select('id, office_id, contract_status')
			.eq('id', clientId)
			.maybeSingle();
		if (error) throw error;
		if (!data) throw new ServiceError(404, 'Client not found');
		if (data.office_id !== officeId) throw new ServiceError(403, 'Forbidden');
		if (data.contract_status !== 'active')
			throw new ServiceError(400, 'Client is not active', {
				contract_status: data.contract_status,
			});
	}

	private async assertStaffsPermitted(
		serviceTypeId: string,
		staffIds: string[],
	) {
		if (staffIds.length === 0) return;
		const { data, error } = await this.supabase
			.from('staff_service_type_abilities')
			.select('staff_id')
			.eq('service_type_id', serviceTypeId)
			.in('staff_id', staffIds);
		if (error) throw error;
		const permittedIds = new Set((data ?? []).map((row) => row.staff_id));
		const missing = staffIds.filter((id) => !permittedIds.has(id));
		if (missing.length > 0) {
			throw new ServiceError(409, 'Staff not permitted for service type', {
				staff_ids: missing,
				service_type_id: serviceTypeId,
			});
		}
	}

	private async assertNoOverlap(params: {
		staffIds: string[];
		weekday: BasicSchedule['day_of_week'];
		startTime: BasicSchedule['time']['start'];
		endTime: BasicSchedule['time']['end'];
		excludeId?: string;
	}) {
		if (params.staffIds.length === 0) return;
		const overlaps = await this.basicScheduleRepository.findOverlaps({
			staff_ids: params.staffIds,
			weekday: params.weekday,
			start_time: formatTime(params.startTime),
			end_time: formatTime(params.endTime),
			excludeId: params.excludeId,
		});
		if (overlaps.length > 0) {
			throw new ServiceError(409, 'Overlapping basic schedule exists', {
				conflicts: overlaps.map((o) => o.id),
			});
		}
	}

	private toRecord(schedule: BasicScheduleWithStaff): BasicScheduleRecord {
		return {
			id: schedule.id,
			client_id: schedule.client_id,
			service_type_id: schedule.service_type_id,
			staff_ids: schedule.staff_ids,
			weekday: schedule.day_of_week,
			start_time: schedule.time.start,
			end_time: schedule.time.end,
			note: schedule.note ?? null,
			deleted_at: schedule.deleted_at ?? null,
			created_at: schedule.created_at,
			updated_at: schedule.updated_at,
		};
	}

	async list(
		userId: string,
		filters: {
			weekday?: DayOfWeek;
			client_id?: string;
			service_type_id?: string;
			includeDeleted?: boolean;
		} = {},
	): Promise<BasicScheduleRecord[]> {
		await this.getAdminStaff(userId);
		const schedules = await this.basicScheduleRepository.list(filters);
		return schedules.map((s) => this.toRecord(s));
	}

	async create(
		userId: string,
		input: BasicScheduleInput,
	): Promise<BasicScheduleRecord> {
		const staff = await this.getAdminStaff(userId);
		const parsed = BasicScheduleInputSchema.safeParse(input);
		if (!parsed.success) {
			throw new ServiceError(400, 'Validation error', parsed.error.issues);
		}
		const data = parsed.data;
		await this.assertClientActive(data.client_id, staff.office_id);
		await this.assertStaffsPermitted(data.service_type_id, data.staff_ids);
		await this.assertNoOverlap({
			staffIds: data.staff_ids,
			weekday: data.weekday,
			startTime: data.start_time,
			endTime: data.end_time,
		});

		const now = new Date();
		const schedule: BasicSchedule = {
			id: crypto.randomUUID(),
			client_id: data.client_id,
			service_type_id: data.service_type_id,
			day_of_week: data.weekday,
			time: { start: data.start_time, end: data.end_time },
			note: data.note ?? null,
			deleted_at: null,
			created_at: now,
			updated_at: now,
		};

		await this.basicScheduleRepository.create(schedule, data.staff_ids);
		return this.toRecord({ ...schedule, staff_ids: data.staff_ids });
	}

	async update(
		userId: string,
		id: string,
		input: BasicScheduleInput,
	): Promise<BasicScheduleRecord> {
		const staff = await this.getAdminStaff(userId);
		const existing = await this.basicScheduleRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Basic schedule not found');
		const parsed = BasicScheduleInputSchema.safeParse(input);
		if (!parsed.success)
			throw new ServiceError(400, 'Validation error', parsed.error.issues);
		const data = parsed.data;

		await this.assertClientActive(data.client_id, staff.office_id);
		await this.assertStaffsPermitted(data.service_type_id, data.staff_ids);
		await this.assertNoOverlap({
			staffIds: data.staff_ids,
			weekday: data.weekday,
			startTime: data.start_time,
			endTime: data.end_time,
			excludeId: id,
		});

		const updated: BasicSchedule = {
			...existing,
			client_id: data.client_id,
			service_type_id: data.service_type_id,
			day_of_week: data.weekday,
			time: { start: data.start_time, end: data.end_time },
			note: data.note ?? null,
			deleted_at: existing.deleted_at,
			updated_at: new Date(),
		};

		await this.basicScheduleRepository.update(updated, data.staff_ids);
		return this.toRecord({ ...updated, staff_ids: data.staff_ids });
	}

	async delete(userId: string, id: string): Promise<void> {
		await this.getAdminStaff(userId);
		const existing = await this.basicScheduleRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Basic schedule not found');
		await this.basicScheduleRepository.softDelete(id, new Date());
	}
}
