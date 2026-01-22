import { createSupabaseClient } from '@/utils/supabase/server';
import type {
	ClientOption,
	ServiceTypeOption,
} from './_components/BasicScheduleFilterBar/types';

export const fetchFilterOptions = async (): Promise<{
	clients: ClientOption[];
	serviceTypes: ServiceTypeOption[];
}> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return { clients: [], serviceTypes: [] };
	}

	// スタッフ情報から事業所IDを取得
	const { data: staff } = await supabase
		.from('staffs')
		.select('office_id')
		.eq('auth_user_id', user.id)
		.single();

	if (!staff) {
		return { clients: [], serviceTypes: [] };
	}

	// 利用者を取得（契約中のみ）
	const { data: clients } = await supabase
		.from('clients')
		.select('id, name')
		.eq('office_id', staff.office_id)
		.eq('contract_status', 'active')
		.order('name');

	// サービス区分を取得
	const { data: serviceTypes } = await supabase
		.from('service_types')
		.select('id, name')
		.order('display_order');

	return {
		clients: clients ?? [],
		serviceTypes: serviceTypes ?? [],
	};
};
