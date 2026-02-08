import { describe, expect, it } from 'vitest';
import {
	ContractStatusSchema,
	ServiceUserInputSchema,
	ServiceUserSchema,
} from './serviceUser';

describe('ServiceUserSchema', () => {
	const validServiceUser = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		office_id: '550e8400-e29b-41d4-a716-446655440001',
		name: 'テスト太郎',
		address: '東京都新宿区1-1-1',
		contract_status: 'active',
		created_at: new Date(),
		updated_at: new Date(),
	};

	it('有効なServiceUserデータを受け入れる', () => {
		const result = ServiceUserSchema.safeParse(validServiceUser);
		expect(result.success).toBe(true);
	});

	it('addressがnullでも有効', () => {
		const data = { ...validServiceUser, address: null };
		const result = ServiceUserSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.address).toBeNull();
		}
	});

	it('addressがundefined（省略）でも有効', () => {
		const { address: _, ...dataWithoutAddress } = validServiceUser;
		const result = ServiceUserSchema.safeParse(dataWithoutAddress);
		// optional なので成功する
		expect(result.success).toBe(true);
	});

	it('nameが空の場合はエラー', () => {
		const data = { ...validServiceUser, name: '' };
		const result = ServiceUserSchema.safeParse(data);
		expect(result.success).toBe(false);
	});

	it('idがUUID形式でない場合はエラー', () => {
		const data = { ...validServiceUser, id: 'invalid-id' };
		const result = ServiceUserSchema.safeParse(data);
		expect(result.success).toBe(false);
	});
});

describe('ServiceUserInputSchema', () => {
	it('氏名のみで有効', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
		});
		expect(result.success).toBe(true);
	});

	it('氏名と住所で有効', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
			address: '東京都新宿区1-1-1',
		});
		expect(result.success).toBe(true);
	});

	it('氏名が空の場合はエラー', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: '',
		});
		expect(result.success).toBe(false);
	});

	it('氏名が空白のみの場合はエラー', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: '   ',
		});
		expect(result.success).toBe(false);
	});

	it('氏名が100文字超えの場合はエラー', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'a'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	it('住所が200文字超えの場合はエラー', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
			address: 'a'.repeat(201),
		});
		expect(result.success).toBe(false);
	});

	it('住所が空白のみの場合はエラー', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
			address: '   ',
		});
		expect(result.success).toBe(false);
	});

	it('住所がnullの場合は無効（optionalなので空文字列として処理されない）', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
			address: null,
		});
		// nullは文字列ではないのでスキーマエラー
		expect(result.success).toBe(false);
	});

	it('住所が空文字列の場合は有効（optionalなので）', () => {
		const result = ServiceUserInputSchema.safeParse({
			name: 'テスト太郎',
			address: '',
		});
		// refineの!valで空文字列はスキップされるので有効
		expect(result.success).toBe(true);
	});
});

describe('ContractStatusSchema', () => {
	it('activeは有効', () => {
		const result = ContractStatusSchema.safeParse('active');
		expect(result.success).toBe(true);
	});

	it('suspendedは有効', () => {
		const result = ContractStatusSchema.safeParse('suspended');
		expect(result.success).toBe(true);
	});

	it('inactiveは無効', () => {
		const result = ContractStatusSchema.safeParse('inactive');
		expect(result.success).toBe(false);
	});
});
