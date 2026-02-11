import { randomUUID } from 'node:crypto';

/**
 * テスト用の RFC 4122 準拠 UUID を生成する
 * Zod v4 の z.uuid() バリデーションを通過することを保証
 */
export const createTestId = (): string => randomUUID();

/**
 * テストで繰り返し使う固定 UUID（RFC 4122 v4 準拠）
 *
 * 新しいテストファイルでは、ここから選ぶか createTestId() で生成すること。
 * `aaaaaaaa-bbbb-cccc-...` のような非準拠 UUID は z.uuid() で弾かれる。
 */
export const TEST_IDS = {
	CLIENT_1: '550e8400-e29b-41d4-a716-446655440001',
	CLIENT_2: '550e8400-e29b-41d4-a716-446655440002',
	STAFF_1: '550e8400-e29b-41d4-a716-446655440011',
	STAFF_2: '550e8400-e29b-41d4-a716-446655440012',
	SCHEDULE_1: '550e8400-e29b-41d4-a716-446655440021',
	SCHEDULE_2: '550e8400-e29b-41d4-a716-446655440022',
	OFFICE_1: '550e8400-e29b-41d4-a716-446655440031',
	OFFICE_2: '550e8400-e29b-41d4-a716-446655440032',
} as const;
