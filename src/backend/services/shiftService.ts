import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { Shift } from '@/models/shift';
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

export interface StaffAssignmentResult {
	oldStaffName: string;
	newStaffName: string;
}

export interface StaffAvailability {
	available: boolean;
	conflictingShifts?: Shift[];
}

interface ShiftServiceOptions {
	staffRepository?: StaffRepository;
	shiftRepository?: ShiftRepository;
}

export class ShiftService {
	private staffRepository: StaffRepository;
	private shiftRepository: ShiftRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options?: ShiftServiceOptions,
	) {
		this.staffRepository = options?.staffRepository ?? new StaffRepository(supabase);
		this.shiftRepository = options?.shiftRepository ?? new ShiftRepository(supabase);
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
		await this.shiftRepository.updateStaffAssignment(shiftId, newStaffId, reason);

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
		await this.shiftRepository.cancelShift(shiftId, reason, category, canceledAt);
	}

	/**
	 * スタッフの時間重複チェック
	 */
	async validateStaffAvailability(
		userId: string,
		staffId: string,
		startTime: Date,
		endTime: Date,
		excludeShiftId?: string,
	): Promise<StaffAvailability> {
		// 認可チェック
		await this.getAdminStaff(userId);

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

		return {
			available: false,
			conflictingShifts,
		};
	}
}
