import { BasicScheduleRepository } from '@/backend/repositories/basicScheduleRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { BasicScheduleWithStaff } from '@/models/basicSchedule';
import { Shift } from '@/models/shift';
import { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { addJstDays, getJstDayOfWeek, setJstTime } from '@/utils/date';
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

export interface GenerateResult {
	created: number;
	skipped: number;
	total: number;
}

interface WeeklyScheduleServiceOptions {
	basicScheduleRepository?: BasicScheduleRepository;
	shiftRepository?: ShiftRepository;
	staffRepository?: StaffRepository;
}

const DAY_OF_WEEK_OFFSET: Record<DayOfWeek, number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
	Sat: 5,
	Sun: 6,
};

export class WeeklyScheduleService {
	private basicScheduleRepository: BasicScheduleRepository;
	private shiftRepository: ShiftRepository;
	private staffRepository: StaffRepository;

	constructor(
		private supabase: SupabaseClient<Database>,
		options?: WeeklyScheduleServiceOptions,
	) {
		this.basicScheduleRepository =
			options?.basicScheduleRepository ?? new BasicScheduleRepository(supabase);
		this.shiftRepository =
			options?.shiftRepository ?? new ShiftRepository(supabase);
		this.staffRepository =
			options?.staffRepository ?? new StaffRepository(supabase);
	}

	private async getAdminStaff(userId: string) {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');
		if (staff.role !== 'admin') throw new ServiceError(403, 'Forbidden');
		return staff;
	}

	/**
	 * 週開始日が月曜日であることを検証（JST ベース）
	 */
	private assertIsMonday(date: Date): void {
		const dayOfWeek = getJstDayOfWeek(date);
		if (dayOfWeek !== 1) {
			throw new ServiceError(400, 'Week start date must be Monday');
		}
	}

	/**
	 * 曜日から週開始日ベースの日付を計算（JST ベース）
	 */
	private calculateDate(weekStartDate: Date, dayOfWeek: DayOfWeek): Date {
		const offset = DAY_OF_WEEK_OFFSET[dayOfWeek];
		return addJstDays(weekStartDate, offset);
	}

	/**
	 * 基本スケジュールからシフトエンティティを作成
	 */
	private createShiftFromBasicSchedule(
		basicSchedule: BasicScheduleWithStaff,
		shiftDate: Date,
	): Shift {
		const now = new Date();
		const staffId =
			basicSchedule.staff_ids.length > 0 ? basicSchedule.staff_ids[0] : null;
		const isUnassigned = staffId === null;

		return {
			id: crypto.randomUUID(),
			client_id: basicSchedule.client_id,
			service_type_id: basicSchedule.service_type_id,
			staff_id: staffId,
			date: shiftDate,
			time: {
				start: basicSchedule.time.start,
				end: basicSchedule.time.end,
			},
			status: 'scheduled',
			is_unassigned: isUnassigned,
			created_at: now,
			updated_at: now,
		};
	}

	/**
	 * 週間シフトを生成
	 * @param userId 実行ユーザーのAuth ID
	 * @param weekStartDate 週の開始日（月曜日）
	 */
	async generateWeeklyShifts(
		userId: string,
		weekStartDate: Date,
	): Promise<GenerateResult> {
		const staff = await this.getAdminStaff(userId);
		const officeId = staff.office_id;
		this.assertIsMonday(weekStartDate);

		// 週の終了日を計算（日曜日）（JST ベース）
		const weekEndDate = addJstDays(weekStartDate, 6);

		// 自事業所のアクティブな基本スケジュールを取得
		const basicSchedules = await this.basicScheduleRepository.list({
			officeId,
			includeDeleted: false,
		});

		if (basicSchedules.length === 0) {
			return { created: 0, skipped: 0, total: 0 };
		}

		// 既存シフトを取得（重複チェック用、自事業所のみ）
		const existingShiftsMap = await this.shiftRepository.findExistingInRange(
			weekStartDate,
			weekEndDate,
			officeId,
		);

		const shiftsToCreate: Shift[] = [];
		let skipped = 0;

		for (const basicSchedule of basicSchedules) {
			const shiftDate = this.calculateDate(
				weekStartDate,
				basicSchedule.day_of_week,
			);

			// JST ベースで timestamptz 形式のキーを生成
			const startDateTime = setJstTime(
				shiftDate,
				basicSchedule.time.start.hour,
				basicSchedule.time.start.minute,
			);
			const endDateTime = setJstTime(
				shiftDate,
				basicSchedule.time.end.hour,
				basicSchedule.time.end.minute,
			);

			// 重複チェック（リポジトリと同じキー形式を使用）
			const key = `${basicSchedule.client_id}|${startDateTime.toISOString()}|${endDateTime.toISOString()}`;
			const clientExisting = existingShiftsMap.get(basicSchedule.client_id);
			if (clientExisting?.has(key)) {
				skipped++;
				continue;
			}

			const shift = this.createShiftFromBasicSchedule(basicSchedule, shiftDate);
			shiftsToCreate.push(shift);
		}

		// 一括作成
		if (shiftsToCreate.length > 0) {
			await this.shiftRepository.createMany(shiftsToCreate);
		}

		return {
			created: shiftsToCreate.length,
			skipped,
			total: basicSchedules.length,
		};
	}

	/**
	 * シフト一覧を取得（管理者用）
	 */
	async listShifts(
		userId: string,
		filters: {
			startDate: Date;
			endDate: Date;
			staffId?: string;
		},
	): Promise<Shift[]> {
		const staff = await this.getAdminStaff(userId);

		return this.shiftRepository.list({
			officeId: staff.office_id,
			startDate: filters.startDate,
			endDate: filters.endDate,
			staffId: filters.staffId,
		});
	}

	/**
	 * 自分のシフト一覧を取得（ヘルパー用）
	 */
	async listMyShifts(
		userId: string,
		filters: {
			startDate: Date;
			endDate: Date;
		},
	): Promise<Shift[]> {
		const staff = await this.staffRepository.findByAuthUserId(userId);
		if (!staff) throw new ServiceError(404, 'Staff not found');

		return this.shiftRepository.list({
			officeId: staff.office_id,
			startDate: filters.startDate,
			endDate: filters.endDate,
			staffId: staff.id,
		});
	}
}
