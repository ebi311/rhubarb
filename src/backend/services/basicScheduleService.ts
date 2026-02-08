import { BasicScheduleRepository } from '@/backend/repositories/basicScheduleRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { BasicSchedule, BasicScheduleWithStaff } from '@/models/basicSchedule';
import {
	BasicScheduleInput,
	BasicScheduleInputSchema,
	BasicScheduleRecord,
	BatchScheduleOperation,
	BatchScheduleOperationSchema,
	BatchScheduleResult,
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

type BatchOperationError = {
	operation: 'create' | 'update' | 'delete';
	index: number;
	message: string;
};

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
			client: schedule.clients,
			service_type_id: schedule.service_type_id,
			staffs: schedule.assignedStaffs,
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

	async findById(id: string): Promise<BasicScheduleRecord | null> {
		const schedule = await this.basicScheduleRepository.findById(id);
		if (!schedule) return null;
		return this.toRecord(schedule);
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
		const newSchedule = await this.findById(schedule.id);
		if (!newSchedule)
			throw new ServiceError(500, 'Failed to retrieve created schedule');
		return newSchedule;
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
		const updatedSchedule = await this.findById(id);
		if (!updatedSchedule)
			throw new ServiceError(500, 'Failed to retrieve updated schedule');
		return updatedSchedule;
	}

	async delete(userId: string, id: string): Promise<void> {
		await this.getAdminStaff(userId);
		const existing = await this.basicScheduleRepository.findById(id);
		if (!existing) throw new ServiceError(404, 'Basic schedule not found');
		await this.basicScheduleRepository.softDelete(id, new Date());
	}

	/**
	 * 指定した利用者のスケジュール一覧を取得
	 */
	async listByClientId(
		userId: string,
		clientId: string,
	): Promise<BasicScheduleRecord[]> {
		const staff = await this.getAdminStaff(userId);
		await this.assertClientActive(clientId, staff.office_id);

		const schedules = await this.basicScheduleRepository.list({
			client_id: clientId,
			includeDeleted: false,
		});
		return schedules.map((s) => this.toRecord(s));
	}

	/**
	 * 複数スケジュールの一括作成・更新・削除
	 */
	async batchUpsert(
		userId: string,
		clientId: string,
		operations: BatchScheduleOperation,
	): Promise<BatchScheduleResult> {
		const staff = await this.getAdminStaff(userId);
		await this.assertClientActive(clientId, staff.office_id);

		const parsed = BatchScheduleOperationSchema.safeParse(operations);
		if (!parsed.success) {
			throw new ServiceError(400, 'Validation error', parsed.error.issues);
		}
		const { create, update, delete: deleteIds } = parsed.data;

		const errors: BatchOperationError[] = [];

		const createdCount = await this.executeBatchCreate(
			create,
			clientId,
			errors,
		);
		const updatedCount = await this.executeBatchUpdate(
			update,
			clientId,
			errors,
		);
		const deletedCount = await this.executeBatchDelete(
			deleteIds,
			clientId,
			errors,
		);

		return {
			created: createdCount,
			updated: updatedCount,
			deleted: deletedCount,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	private async executeBatchCreate(
		inputs: BasicScheduleInput[],
		clientId: string,
		errors: BatchOperationError[],
	): Promise<number> {
		let count = 0;
		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i];
			try {
				if (input.client_id !== clientId) {
					throw new ServiceError(400, 'Client ID mismatch');
				}

				await this.assertStaffsPermitted(
					input.service_type_id,
					input.staff_ids,
				);
				await this.assertNoOverlap({
					staffIds: input.staff_ids,
					weekday: input.weekday,
					startTime: input.start_time,
					endTime: input.end_time,
				});

				const now = new Date();
				const schedule: BasicSchedule = {
					id: crypto.randomUUID(),
					client_id: input.client_id,
					service_type_id: input.service_type_id,
					day_of_week: input.weekday,
					time: { start: input.start_time, end: input.end_time },
					note: input.note ?? null,
					deleted_at: null,
					created_at: now,
					updated_at: now,
				};

				await this.basicScheduleRepository.create(schedule, input.staff_ids);
				count++;
			} catch (e) {
				const message = e instanceof ServiceError ? e.message : 'Unknown error';
				errors.push({ operation: 'create', index: i, message });
			}
		}
		return count;
	}

	private async executeBatchUpdate(
		updates: { id: string; data: BasicScheduleInput }[],
		clientId: string,
		errors: BatchOperationError[],
	): Promise<number> {
		let count = 0;
		for (let i = 0; i < updates.length; i++) {
			const { id, data } = updates[i];
			try {
				const existing = await this.basicScheduleRepository.findById(id);
				if (!existing) {
					throw new ServiceError(404, 'Schedule not found');
				}

				// 既存のスケジュールが指定されたclientIdに属しているか検証
				if (existing.clients.id !== clientId) {
					throw new ServiceError(403, 'Client ID mismatch');
				}

				if (data.client_id !== clientId) {
					throw new ServiceError(400, 'Client ID mismatch');
				}

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
				count++;
			} catch (e) {
				const message = e instanceof ServiceError ? e.message : 'Unknown error';
				errors.push({ operation: 'update', index: i, message });
			}
		}
		return count;
	}

	private async executeBatchDelete(
		ids: string[],
		clientId: string,
		errors: BatchOperationError[],
	): Promise<number> {
		let count = 0;
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			try {
				const existing = await this.basicScheduleRepository.findById(id);
				if (!existing) {
					throw new ServiceError(404, 'Schedule not found');
				}

				if (existing.clients.id !== clientId) {
					throw new ServiceError(403, 'Client ID mismatch');
				}

				await this.basicScheduleRepository.softDelete(id, new Date());
				count++;
			} catch (e) {
				const message = e instanceof ServiceError ? e.message : 'Unknown error';
				errors.push({ operation: 'delete', index: i, message });
			}
		}
		return count;
	}
}
