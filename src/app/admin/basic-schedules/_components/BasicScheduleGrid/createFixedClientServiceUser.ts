import type { ServiceUser } from '@/models/serviceUser';

/** ダミー ServiceUser のプレースホルダー日時（不安定な new Date() を避ける） */
const PLACEHOLDER_DATE = new Date('2000-01-01T00:00:00Z');

/** ダミー ServiceUser のプレースホルダーオフィスID */
const PLACEHOLDER_OFFICE_ID = '00000000-0000-4000-8000-000000000000';

/**
 * fixedClientId 用のダミー ServiceUser を生成する。
 * BasicScheduleForm の serviceUsers prop に渡すために使用。
 */
export const createFixedClientServiceUser = (
	clientId: string,
	clientName: string,
): ServiceUser => ({
	id: clientId,
	name: clientName,
	office_id: PLACEHOLDER_OFFICE_ID,
	contract_status: 'active',
	created_at: PLACEHOLDER_DATE,
	updated_at: PLACEHOLDER_DATE,
});
