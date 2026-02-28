import { STAFF_SHIFT_INTERVAL_MINUTES } from '@/backend/constants';
import { ServiceUserRepository } from '@/backend/repositories/serviceUserRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { Shift } from '@/models/shift';
import {
	AssignStaffWithCascadeOutput,
	CreateOneOffShiftServiceInput,
	SuggestCandidateStaffForShiftOutput,
	SuggestCandidateStaffForShiftWithNewDatetimeInput,
	UpdateDatetimeAndAssignWithCascadeInput,
} from '@/models/shiftActionSchemas';
import { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { formatJstDateString, getJstDateOnly, setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import { v7 as randomUUID } from 'uuid';

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

export interface StaffAssignmentResult {
	oldStaffName: string;
	newStaffName: string;
}

export interface ConflictingShift {
	id: string;
	clientId: string;
	clientName: string;
	date: Date;
	startTime: Date;
	endTime: Date;
}

export interface StaffAvailability {
	available: boolean;
	conflictingShifts?: ConflictingShift[];
}

export interface UpdateShiftScheduleResult {
	shiftId: string;
}

interface ShiftServiceOptions {
	staffRepository?: StaffRepository;
	shiftRepository?: ShiftRepository;
	serviceUserRepository?: ServiceUserRepository;
}

export class ShiftService {
	private staffRepository: StaffRepository;
	private shiftRepository: ShiftRepository;
	private serviceUserRepository: ServiceUserRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options?: ShiftServiceOptions,
	) {
		this.staffRepository =
			options?.staffRepository ?? new StaffRepository(supabase);
		this.shiftRepository =
			options?.shiftRepository ?? new ShiftRepository(supabase);
		this.serviceUserRepository =
			options?.serviceUserRepository ?? new ServiceUserRepository(supabase);
	}

	/**
	 * 管理者スタッフを取得し、認可チェックを行う
	 */
	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	/**
	 * 担当者を変更する
	 */
	async changeStaffAssignment(
		userId: string,
		shiftId: string,
		newStaffId: string,
		reason?: string,
	): Promise<StaffAssignmentResult> {
		// 認可チェック
		await this.getAdminStaff(userId);

		// シフトの存在確認
		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		// ステータス検証
		if (shift.status === 'canceled' || shift.status === 'completed') {
			throw new ServiceError(400, 'Cannot change canceled or completed shift');
		}

		// 過去シフトは担当者変更不可（JST の日付単位）
		const shiftStartTime = setJstTime(
			shift.date,
			shift.time.start.hour,
			shift.time.start.minute,
		);
		this.ensureNotChangingStaffForPastShift(shiftStartTime);

		// 元の担当者名を取得
		let oldStaffName = '未割当';
		if (shift.staff_id) {
			const oldStaff = await this.staffRepository.findById(shift.staff_id);
			if (oldStaff) {
				oldStaffName = oldStaff.name;
			}
		}

		// 新しい担当者名を取得
		const newStaff = await this.staffRepository.findById(newStaffId);
		if (!newStaff) throw new ServiceError(404, 'New staff not found');
		const newStaffName = newStaff.name;

		// Repository 呼び出し
		await this.shiftRepository.updateStaffAssignment(
			shiftId,
			newStaffId,
			reason,
		);

		return {
			oldStaffName,
			newStaffName,
		};
	}

	/**
	 * シフトをキャンセルする
	 */
	async cancelShift(
		userId: string,
		shiftId: string,
		reason: string,
		category: 'client' | 'staff' | 'other',
	): Promise<void> {
		// 認可チェック
		await this.getAdminStaff(userId);

		// シフトの存在確認
		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		// ステータス検証（completed は変更不可）
		if (shift.status === 'completed') {
			throw new ServiceError(400, 'Cannot cancel completed shift');
		}

		// Repository 呼び出し
		const canceledAt = new Date();
		await this.shiftRepository.cancelShift(
			shiftId,
			reason,
			category,
			canceledAt,
		);
	}

	/**
	 * キャンセル済みシフトを復元する
	 */
	async restoreShift(userId: string, shiftId: string): Promise<void> {
		// 認可チェック
		await this.getAdminStaff(userId);

		// シフトの存在確認
		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		// ステータス検証（canceled のみ復元可能）
		if (shift.status !== 'canceled') {
			throw new ServiceError(400, 'Shift is not canceled');
		}

		// Repository 呼び出し
		await this.shiftRepository.restoreShift(shiftId);
	}

	/**
	 * スタッフの時間重複チェック
	 */
	async validateStaffAvailability(
		staffId: string,
		startTime: Date,
		endTime: Date,
		excludeShiftId?: string,
	): Promise<StaffAvailability> {
		// Repository で重複シフトを検索
		const conflictingShifts = await this.shiftRepository.findConflictingShifts(
			staffId,
			startTime,
			endTime,
			excludeShiftId,
		);

		if (conflictingShifts.length === 0) {
			return { available: true };
		}

		// クライアント名を取得
		const conflictingShiftsWithClient = await Promise.all(
			conflictingShifts.map(async (shift) => {
				const client = await this.serviceUserRepository.findById(
					shift.client_id,
				);
				return {
					id: shift.id,
					clientId: shift.client_id,
					clientName: client?.name ?? '不明',
					date: shift.date,
					startTime: setJstTime(
						shift.date,
						shift.time.start.hour,
						shift.time.start.minute,
					),
					endTime: setJstTime(
						shift.date,
						shift.time.end.hour,
						shift.time.end.minute,
					),
				};
			}),
		);

		return {
			available: false,
			conflictingShifts: conflictingShiftsWithClient,
		};
	}

	/**
	 * 単発シフトを作成する（基本スケジュール外の追加）
	 */
	async createOneOffShift(
		userId: string,
		input: CreateOneOffShiftServiceInput,
	): Promise<Shift> {
		const adminStaff = await this.getAdminStaff(userId);

		// client の存在確認 + office 境界（別 office も 404 に統一）
		const client = await this.serviceUserRepository.findById(input.client_id);
		if (!client || client.office_id !== adminStaff.office_id) {
			throw new ServiceError(404, 'Client not found');
		}

		// 担当者が指定されている場合は存在確認 + office 境界（別 office も 404 に統一）
		if (input.staff_id) {
			const staff = await this.staffRepository.findById(input.staff_id);
			if (!staff || staff.office_id !== adminStaff.office_id) {
				throw new ServiceError(404, 'Assigned staff not found');
			}
		}

		const startAt = setJstTime(
			input.date,
			input.start_time.hour,
			input.start_time.minute,
		);
		const endAt = setJstTime(
			input.date,
			input.end_time.hour,
			input.end_time.minute,
		);

		// 同一 client の時間帯重複チェック（部分的な重なりも含めてNG）
		const clientConflicts =
			await this.shiftRepository.findClientConflictingShifts(
				input.client_id,
				startAt,
				endAt,
				adminStaff.office_id,
			);
		if (clientConflicts.length > 0) {
			throw new ServiceError(409, 'Client has conflicting shift', {
				conflictingShiftIds: clientConflicts.map((s) => s.id),
			});
		}

		// 担当者がいる場合は時間衝突チェック
		if (input.staff_id) {
			const conflicts = await this.shiftRepository.findConflictingShifts(
				input.staff_id,
				startAt,
				endAt,
			);
			if (conflicts.length > 0) {
				throw new ServiceError(409, 'Staff has conflicting shift', {
					conflictingShiftIds: conflicts.map((s) => s.id),
				});
			}
		}

		const now = new Date();
		const isUnassigned = !input.staff_id;
		const shift: Shift = {
			id: randomUUID(),
			client_id: input.client_id,
			service_type_id: input.service_type_id,
			staff_id: input.staff_id ?? null,
			date: input.date,
			time: { start: input.start_time, end: input.end_time },
			status: 'scheduled',
			is_unassigned: isUnassigned,
			created_at: now,
			updated_at: now,
		};

		await this.shiftRepository.create(shift);
		return shift;
	}

	private ensureShiftUpdatable(shift: Shift) {
		if (shift.status === 'canceled' || shift.status === 'completed') {
			throw new ServiceError(400, 'Cannot update canceled or completed shift');
		}
	}

	private async ensureShiftInAdminOffice(
		adminOfficeId: string,
		shift: Shift,
	): Promise<void> {
		const client = await this.serviceUserRepository.findById(shift.client_id);
		if (!client || client.office_id !== adminOfficeId) {
			throw new ServiceError(404, 'Shift not found');
		}
	}

	private async ensureStaffAssignableToOffice(
		staffId: string,
		officeId: string,
	): Promise<void> {
		const staff = await this.staffRepository.findById(staffId);
		if (!staff || staff.office_id !== officeId) {
			throw new ServiceError(404, 'Assigned staff not found');
		}
	}

	private ensureNotMovingToPast(newStartTime: Date): void {
		const todayJst = getJstDateOnly(new Date());
		const newStartDateJst = getJstDateOnly(newStartTime);
		if (newStartDateJst.getTime() < todayJst.getTime()) {
			throw new ServiceError(400, 'Cannot move shift to the past');
		}
	}

	private ensureNotChangingStaffForPastShift(shiftStartTime: Date): void {
		const todayJst = getJstDateOnly(new Date());
		const shiftDateJst = getJstDateOnly(shiftStartTime);
		if (shiftDateJst.getTime() < todayJst.getTime()) {
			throw new ServiceError(400, 'Cannot change staff for past shift');
		}
	}

	private ensureEndAfterStart(newStartTime: Date, newEndTime: Date): void {
		if (newEndTime.getTime() <= newStartTime.getTime()) {
			throw new ServiceError(400, 'newEndTime must be after newStartTime');
		}
	}

	private ensureSameDayDatetimeRange(
		newStartTime: Date,
		newEndTime: Date,
	): void {
		const startDate = getJstDateOnly(newStartTime);
		const endDate = getJstDateOnly(newEndTime);
		if (startDate.getTime() !== endDate.getTime()) {
			throw new ServiceError(400, 'Cross-day datetime is not supported');
		}
	}

	private async ensureNoClientConflicts(params: {
		clientId: string;
		startTime: Date;
		endTime: Date;
		officeId: string;
		excludeShiftId: string;
	}): Promise<void> {
		const conflicts = await this.shiftRepository.findClientConflictingShifts(
			params.clientId,
			params.startTime,
			params.endTime,
			params.officeId,
			params.excludeShiftId,
		);
		if (conflicts.length > 0) {
			throw new ServiceError(409, 'Client has conflicting shift', {
				conflictingShiftIds: conflicts.map((s) => s.id),
			});
		}
	}

	private async ensureNoStaffConflicts(params: {
		staffId: string;
		startTime: Date;
		endTime: Date;
		officeId: string;
		excludeShiftId: string;
	}): Promise<void> {
		const conflicts = await this.shiftRepository.findStaffConflictingShifts(
			params.staffId,
			params.startTime,
			params.endTime,
			params.officeId,
			params.excludeShiftId,
		);
		if (conflicts.length > 0) {
			throw new ServiceError(409, 'Staff has conflicting shift', {
				conflictingShiftIds: conflicts.map((s) => s.id),
			});
		}
	}

	private resolveTargetStaffId(
		newStaffId: string | null | undefined,
		currentStaffId: string | null | undefined,
	): string | null {
		return newStaffId !== undefined ? newStaffId : (currentStaffId ?? null);
	}

	private hasScheduleChanged(params: {
		currentStartTime: Date;
		currentEndTime: Date;
		newStartTime: Date;
		newEndTime: Date;
	}): boolean {
		return (
			params.currentStartTime.getTime() !== params.newStartTime.getTime() ||
			params.currentEndTime.getTime() !== params.newEndTime.getTime()
		);
	}

	private isStaffChanged(
		currentStaffId: string | null | undefined,
		targetStaffId: string | null,
	): boolean {
		return (currentStaffId ?? null) !== targetStaffId;
	}

	private shouldCheckStaffConflicts(
		targetStaffId: string | null,
		isScheduleChanged: boolean,
		isStaffChanged: boolean,
	): targetStaffId is string {
		return targetStaffId != null && (isScheduleChanged || isStaffChanged);
	}

	private hasTimeOverlap(params: {
		aStart: Date;
		aEnd: Date;
		bStart: Date;
		bEnd: Date;
	}): boolean {
		const intervalMs = STAFF_SHIFT_INTERVAL_MINUTES * 60_000;
		const bufferedBStart = new Date(params.bStart.getTime() - intervalMs);
		const bufferedBEnd = new Date(params.bEnd.getTime() + intervalMs);
		return params.aStart < bufferedBEnd && params.aEnd > bufferedBStart;
	}

	private toShiftRecord(shift: Shift) {
		return {
			id: shift.id,
			client_id: shift.client_id,
			service_type_id: shift.service_type_id,
			staff_id: shift.staff_id ?? null,
			date: shift.date,
			start_time: shift.time.start,
			end_time: shift.time.end,
			status: shift.status,
			is_unassigned: shift.is_unassigned,
			canceled_reason: shift.canceled_reason ?? null,
			canceled_category: shift.canceled_category ?? null,
			canceled_at: shift.canceled_at ?? null,
			created_at: shift.created_at,
			updated_at: shift.updated_at,
		};
	}

	private buildShiftDateWindow(shift: Shift): { start: Date; end: Date } {
		return {
			start: setJstTime(
				shift.date,
				shift.time.start.hour,
				shift.time.start.minute,
			),
			end: setJstTime(shift.date, shift.time.end.hour, shift.time.end.minute),
		};
	}

	private async ensureStaffAssignableForShift(params: {
		newStaffId: string;
		adminOfficeId: string;
		serviceTypeId: ServiceTypeId;
	}): Promise<void> {
		const [newStaff, officeStaff] = await Promise.all([
			this.staffRepository.findById(params.newStaffId),
			this.staffRepository.listByOffice(params.adminOfficeId),
		]);

		if (!newStaff || newStaff.office_id !== params.adminOfficeId) {
			throw new ServiceError(404, 'Assigned staff not found');
		}

		const newStaffWithAbilities = officeStaff.find(
			(staff) => staff.id === params.newStaffId,
		);
		if (
			!newStaffWithAbilities ||
			newStaffWithAbilities.role !== 'helper' ||
			!newStaffWithAbilities.service_type_ids.includes(params.serviceTypeId)
		) {
			throw new ServiceError(400, 'New staff is not assignable to this shift');
		}
	}

	private filterScheduledOverlappingShifts(params: {
		targetShiftId: string;
		targetStart: Date;
		targetEnd: Date;
		shifts: Shift[];
	}): Shift[] {
		return params.shifts.filter((sameDayShift) => {
			if (sameDayShift.id === params.targetShiftId) return false;
			if (sameDayShift.status !== 'scheduled') return false;
			const sameDayShiftWindow = this.buildShiftDateWindow(sameDayShift);
			return this.hasTimeOverlap({
				aStart: params.targetStart,
				aEnd: params.targetEnd,
				bStart: sameDayShiftWindow.start,
				bEnd: sameDayShiftWindow.end,
			});
		});
	}

	private async cascadeUnassignShifts(params: {
		conflictingShifts: Shift[];
		reason?: string;
		assignedShiftId: string;
	}): Promise<string[]> {
		const cascadeUnassignedShiftIds: string[] = [];
		for (const conflictingShift of params.conflictingShifts) {
			try {
				await this.shiftRepository.updateStaffAssignment(
					conflictingShift.id,
					null,
					params.reason,
				);
				cascadeUnassignedShiftIds.push(conflictingShift.id);
			} catch (cause) {
				throw new ServiceError(500, 'Cascade unassign partially failed', {
					failedShiftId: conflictingShift.id,
					assignedShiftId: params.assignedShiftId,
					cascadeUnassignedShiftIds,
					cause,
				});
			}
		}
		return cascadeUnassignedShiftIds;
	}

	private async getClientNameWithCache(
		clientId: string,
		clientNameCache: Map<string, Promise<string>>,
	): Promise<string> {
		const cachedNamePromise = clientNameCache.get(clientId);
		if (cachedNamePromise) return cachedNamePromise;

		const clientNamePromise = this.serviceUserRepository
			.findById(clientId)
			.then((client) => client?.name ?? '不明');
		clientNameCache.set(clientId, clientNamePromise);
		return clientNamePromise;
	}

	private async suggestCandidatesByDatetime(params: {
		adminOfficeId: string;
		shift: Shift;
		targetStart: Date;
		targetEnd: Date;
	}): Promise<SuggestCandidateStaffForShiftOutput> {
		const officeStaff = await this.staffRepository.listByOffice(
			params.adminOfficeId,
		);
		const candidates = officeStaff
			.filter(
				(staff) =>
					staff.role === 'helper' &&
					staff.service_type_ids.includes(params.shift.service_type_id) &&
					staff.id !== params.shift.staff_id,
			)
			.slice(0, 30);

		if (candidates.length === 0) return { candidates: [] };

		const targetDate = getJstDateOnly(params.targetStart);
		const dayShifts = await this.shiftRepository.list({
			officeId: params.adminOfficeId,
			startDate: targetDate,
			endDate: targetDate,
		});

		const clientNameCache = new Map<string, Promise<string>>();
		const candidateResults = await Promise.all(
			candidates.map(async (candidate) => {
				const conflictingShifts = dayShifts.filter((dayShift) => {
					if (dayShift.id === params.shift.id) return false;
					if (dayShift.status !== 'scheduled') return false;
					if (dayShift.staff_id !== candidate.id) return false;
					const dayShiftWindow = this.buildShiftDateWindow(dayShift);
					return this.hasTimeOverlap({
						aStart: params.targetStart,
						aEnd: params.targetEnd,
						bStart: dayShiftWindow.start,
						bEnd: dayShiftWindow.end,
					});
				});

				const conflictsWithClient = await Promise.all(
					conflictingShifts.map(async (conflictingShift) => ({
						shiftId: conflictingShift.id,
						clientName: await this.getClientNameWithCache(
							conflictingShift.client_id,
							clientNameCache,
						),
						date: formatJstDateString(conflictingShift.date),
						startTime: conflictingShift.time.start,
						endTime: conflictingShift.time.end,
					})),
				);

				return {
					staffId: candidate.id,
					staffName: candidate.name,
					conflictingShifts: conflictsWithClient,
				};
			}),
		);

		return { candidates: candidateResults };
	}

	async suggestCandidateStaffForShift(
		userId: string,
		shiftId: string,
	): Promise<SuggestCandidateStaffForShiftOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');
		await this.ensureShiftInAdminOffice(adminStaff.office_id, shift);

		const targetStart = setJstTime(
			shift.date,
			shift.time.start.hour,
			shift.time.start.minute,
		);
		const targetEnd = setJstTime(
			shift.date,
			shift.time.end.hour,
			shift.time.end.minute,
		);

		return this.suggestCandidatesByDatetime({
			adminOfficeId: adminStaff.office_id,
			shift,
			targetStart,
			targetEnd,
		});
	}

	async suggestCandidateStaffForShiftWithNewDatetime(
		userId: string,
		input: SuggestCandidateStaffForShiftWithNewDatetimeInput,
	): Promise<SuggestCandidateStaffForShiftOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const shift = await this.shiftRepository.findById(input.shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');
		await this.ensureShiftInAdminOffice(adminStaff.office_id, shift);
		this.ensureEndAfterStart(input.newStartTime, input.newEndTime);
		this.ensureSameDayDatetimeRange(input.newStartTime, input.newEndTime);

		return this.suggestCandidatesByDatetime({
			adminOfficeId: adminStaff.office_id,
			shift,
			targetStart: input.newStartTime,
			targetEnd: input.newEndTime,
		});
	}

	async assignStaffWithCascadeUnassign(
		userId: string,
		shiftId: string,
		newStaffId: string,
		reason?: string,
	): Promise<AssignStaffWithCascadeOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		this.ensureShiftUpdatable(shift);
		await this.ensureShiftInAdminOffice(adminStaff.office_id, shift);

		const targetWindow = this.buildShiftDateWindow(shift);
		this.ensureNotChangingStaffForPastShift(targetWindow.start);
		if (shift.staff_id === newStaffId) {
			throw new ServiceError(
				400,
				'New staff is already assigned to this shift',
			);
		}

		await this.ensureStaffAssignableForShift({
			newStaffId,
			adminOfficeId: adminStaff.office_id,
			serviceTypeId: shift.service_type_id,
		});

		const sameDayShifts = await this.shiftRepository.list({
			officeId: adminStaff.office_id,
			staffId: newStaffId,
			startDate: shift.date,
			endDate: shift.date,
		});
		const conflictingShifts = this.filterScheduledOverlappingShifts({
			targetShiftId: shift.id,
			targetStart: targetWindow.start,
			targetEnd: targetWindow.end,
			shifts: sameDayShifts,
		});

		await this.shiftRepository.updateStaffAssignment(
			shiftId,
			newStaffId,
			reason,
		);
		const cascadeUnassignedShiftIds = await this.cascadeUnassignShifts({
			conflictingShifts,
			reason,
			assignedShiftId: shiftId,
		});

		const updatedShift = await this.shiftRepository.findById(shiftId);
		if (!updatedShift) throw new ServiceError(404, 'Shift not found');

		return {
			updatedShift: this.toShiftRecord(updatedShift),
			cascadeUnassignedShiftIds,
		};
	}

	/**
	 * シフトの日付/開始/終了（必要に応じて担当者）を更新する
	 */

	async updateShiftScheduleAndAssignWithCascadeUnassign(
		userId: string,
		input: UpdateDatetimeAndAssignWithCascadeInput,
	): Promise<AssignStaffWithCascadeOutput> {
		const adminStaff = await this.getAdminStaff(userId);
		const shift = await this.shiftRepository.findById(input.shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		this.ensureShiftUpdatable(shift);
		await this.ensureShiftInAdminOffice(adminStaff.office_id, shift);
		this.ensureEndAfterStart(input.newStartTime, input.newEndTime);
		this.ensureSameDayDatetimeRange(input.newStartTime, input.newEndTime);

		const currentWindow = this.buildShiftDateWindow(shift);
		const isScheduleChanged = this.hasScheduleChanged({
			currentStartTime: currentWindow.start,
			currentEndTime: currentWindow.end,
			newStartTime: input.newStartTime,
			newEndTime: input.newEndTime,
		});
		const isStaffChanged = this.isStaffChanged(
			shift.staff_id,
			input.newStaffId,
		);
		if (isScheduleChanged) {
			this.ensureNotMovingToPast(input.newStartTime);
		}
		if (isStaffChanged) {
			this.ensureNotChangingStaffForPastShift(currentWindow.start);
		}

		await this.ensureStaffAssignableForShift({
			newStaffId: input.newStaffId,
			adminOfficeId: adminStaff.office_id,
			serviceTypeId: shift.service_type_id,
		});
		await this.ensureNoClientConflicts({
			clientId: shift.client_id,
			startTime: input.newStartTime,
			endTime: input.newEndTime,
			officeId: adminStaff.office_id,
			excludeShiftId: input.shiftId,
		});

		try {
			await this.shiftRepository.updateShiftSchedule(input.shiftId, {
				startTime: input.newStartTime,
				endTime: input.newEndTime,
				staffId: shift.staff_id ?? null,
			});
		} catch (cause) {
			throw new ServiceError(500, 'Failed to update shift datetime', {
				shiftId: input.shiftId,
				cause,
			});
		}

		const targetDate = getJstDateOnly(input.newStartTime);
		const sameDayShifts = await this.shiftRepository.list({
			officeId: adminStaff.office_id,
			staffId: input.newStaffId,
			startDate: targetDate,
			endDate: targetDate,
		});
		const conflictingShifts = this.filterScheduledOverlappingShifts({
			targetShiftId: shift.id,
			targetStart: input.newStartTime,
			targetEnd: input.newEndTime,
			shifts: sameDayShifts,
		});

		try {
			await this.shiftRepository.updateStaffAssignment(
				input.shiftId,
				input.newStaffId,
				input.reason,
			);
		} catch (cause) {
			throw new ServiceError(500, 'Failed to assign new staff', {
				shiftId: input.shiftId,
				newStaffId: input.newStaffId,
				cause,
			});
		}

		const cascadeUnassignedShiftIds = await this.cascadeUnassignShifts({
			conflictingShifts,
			reason: input.reason,
			assignedShiftId: input.shiftId,
		});

		const updatedShift = await this.shiftRepository.findById(input.shiftId);
		if (!updatedShift) throw new ServiceError(404, 'Shift not found');

		return {
			updatedShift: this.toShiftRecord(updatedShift),
			cascadeUnassignedShiftIds,
		};
	}

	async updateShiftSchedule(
		userId: string,
		shiftId: string,
		newStartTime: Date,
		newEndTime: Date,
		newStaffId: string | null | undefined,
		reason?: string,
	): Promise<UpdateShiftScheduleResult> {
		const adminStaff = await this.getAdminStaff(userId);

		const shift = await this.shiftRepository.findById(shiftId);
		if (!shift) throw new ServiceError(404, 'Shift not found');

		const targetStaffId = this.resolveTargetStaffId(newStaffId, shift.staff_id);

		this.ensureShiftUpdatable(shift);
		await this.ensureShiftInAdminOffice(adminStaff.office_id, shift);
		if (newStaffId != null) {
			await this.ensureStaffAssignableToOffice(
				newStaffId,
				adminStaff.office_id,
			);
		}
		const currentStartTime = setJstTime(
			shift.date,
			shift.time.start.hour,
			shift.time.start.minute,
		);
		const currentEndTime = setJstTime(
			shift.date,
			shift.time.end.hour,
			shift.time.end.minute,
		);
		const isScheduleChanged = this.hasScheduleChanged({
			currentStartTime,
			currentEndTime,
			newStartTime,
			newEndTime,
		});
		const isStaffChanged = this.isStaffChanged(shift.staff_id, targetStaffId);
		if (isScheduleChanged) {
			this.ensureNotMovingToPast(newStartTime);
		}
		if (isStaffChanged) {
			this.ensureNotChangingStaffForPastShift(currentStartTime);
		}
		await this.ensureNoClientConflicts({
			clientId: shift.client_id,
			startTime: newStartTime,
			endTime: newEndTime,
			officeId: adminStaff.office_id,
			excludeShiftId: shiftId,
		});

		if (
			this.shouldCheckStaffConflicts(
				targetStaffId,
				isScheduleChanged,
				isStaffChanged,
			)
		) {
			await this.ensureNoStaffConflicts({
				staffId: targetStaffId,
				startTime: newStartTime,
				endTime: newEndTime,
				officeId: adminStaff.office_id,
				excludeShiftId: shiftId,
			});
		}

		await this.shiftRepository.updateShiftSchedule(shiftId, {
			startTime: newStartTime,
			endTime: newEndTime,
			staffId: targetStaffId,
			notes: reason,
		});

		return { shiftId };
	}
}
