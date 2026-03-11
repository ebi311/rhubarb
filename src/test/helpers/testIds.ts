/**
 * テスト用の RFC 4122 準拠 UUID を生成する
 * Zod v4 の z.uuid() バリデーションを通過することを保証
 */
export const createTestId = (): string => {
	const cryptoObj = globalThis.crypto;

	if (typeof cryptoObj?.randomUUID === 'function') {
		return cryptoObj.randomUUID();
	}

	const bytes = new Uint8Array(16);
	if (typeof cryptoObj?.getRandomValues === 'function') {
		cryptoObj.getRandomValues(bytes);
	} else {
		for (let i = 0; i < bytes.length; i += 1) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}

	// RFC 4122 v4
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const toHex = (value: number) => value.toString(16).padStart(2, '0');
	const hex = Array.from(bytes, toHex).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * テストで繰り返し使う固定 UUID（RFC 4122 v4 準拠）
 *
 * 新しいテストファイルでは、ここから選ぶか createTestId() で生成すること。
 * `aaaaaaaa-bbbb-cccc-...` のような非準拠 UUID は z.uuid() で弾かれる。
 *
 * SERVICE_TYPE は UUID ではなく enum 値（ServiceTypeIdSchema 参照）
 */
export const TEST_IDS = {
	CLIENT_1: '550e8400-e29b-41d4-a716-446655440001',
	CLIENT_2: '550e8400-e29b-41d4-a716-446655440002',
	CLIENT_3: '550e8400-e29b-41d4-a716-446655440003',
	CLIENT_4: '550e8400-e29b-41d4-a716-446655440004',
	STAFF_1: '550e8400-e29b-41d4-a716-446655440011',
	STAFF_2: '550e8400-e29b-41d4-a716-446655440012',
	STAFF_3: '550e8400-e29b-41d4-a716-446655440013',
	STAFF_4: '550e8400-e29b-41d4-a716-446655440014',
	SCHEDULE_1: '550e8400-e29b-41d4-a716-446655440021',
	SCHEDULE_2: '550e8400-e29b-41d4-a716-446655440022',
	OFFICE_1: '550e8400-e29b-41d4-a716-446655440031',
	OFFICE_2: '550e8400-e29b-41d4-a716-446655440032',
	USER_1: '550e8400-e29b-41d4-a716-446655440041',
	USER_2: '550e8400-e29b-41d4-a716-446655440042',
	/** サービス種別: 生活支援（enum 値） */
	SERVICE_TYPE_1: 'life-support',
	/** サービス種別: 身体介護（enum 値） */
	SERVICE_TYPE_2: 'physical-care',
} as const;
