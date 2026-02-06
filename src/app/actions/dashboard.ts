'use server';

import { ServiceTypeRepository } from '@/backend/repositories/serviceTypeRepository';
import { ServiceUserRepository } from '@/backend/repositories/serviceUserRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { DashboardService } from '@/backend/services/dashboardService';
import type { DashboardData } from '@/models/dashboardActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import {
	ActionResult,
	errorResult,
	logServerError,
	successResult,
} from './utils/actionResult';

const getAuthUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	return { supabase, user, error } as const;
};

/**
 * ダッシュボードデータを取得する
 */
export const getDashboardDataAction = async (): Promise<
	ActionResult<DashboardData>
> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	try {
		// リポジトリを初期化
		const staffRepo = new StaffRepository(supabase);
		const serviceTypeRepo = new ServiceTypeRepository(supabase);
		const serviceUserRepo = new ServiceUserRepository(supabase);
		const shiftRepo = new ShiftRepository(supabase);

		// 現在のユーザーに紐づくスタッフ情報を取得してoffice_idを特定
		const currentStaff = await staffRepo.findByAuthUserId(user.id);
		if (!currentStaff) return errorResult('Staff not found', 404);

		const officeId = currentStaff.office_id;
		const today = new Date();

		// マスタデータを並列で取得
		const [serviceTypes, clients, staffs] = await Promise.all([
			serviceTypeRepo.findAll(),
			serviceUserRepo.findAll(officeId, 'all'),
			staffRepo.listByOffice(officeId),
		]);

		const serviceTypeMap = new Map<string, string>(
			serviceTypes.map((st) => [st.id, st.name]),
		);
		const clientMap = new Map<string, string>(
			clients.map((c) => [c.id, c.name]),
		);
		const staffMap = new Map<string, string>(staffs.map((s) => [s.id, s.name]));

		// ダッシュボードサービスを構築
		const service = new DashboardService({
			shiftRepository: shiftRepo,
			serviceTypeMap,
			clientMap,
			staffMap,
		});

		// 各データを並列で取得
		const [stats, timeline, alerts] = await Promise.all([
			service.getDashboardStats(officeId, today),
			service.getTodayTimeline(officeId, today),
			service.getAlerts(officeId, today),
		]);

		return successResult<DashboardData>({
			stats,
			timeline,
			alerts,
		});
	} catch (err) {
		logServerError(err);
		return errorResult('Internal server error', 500);
	}
};
