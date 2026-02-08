import { describe, expect, it } from 'vitest';
import {
	BatchScheduleOperationSchema,
	BatchScheduleResultSchema,
} from './basicScheduleActionSchemas';

// 有効なUUID v4形式のテスト用ID
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const STAFF_ID = '550e8400-e29b-41d4-a716-446655440010';
const SCHEDULE_ID = '550e8400-e29b-41d4-a716-446655440100';

describe('BatchScheduleOperationSchema', () => {
	it('空の操作を受け入れる', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [],
			update: [],
			delete: [],
		});
		expect(result.success).toBe(true);
	});

	it('create操作を含む入力を受け入れる', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [
				{
					client_id: CLIENT_ID,
					service_type_id: 'physical-care',
					staff_ids: [STAFF_ID],
					weekday: 'Mon',
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					note: null,
				},
			],
			update: [],
			delete: [],
		});
		expect(result.success).toBe(true);
	});

	it('update操作を含む入力を受け入れる', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [],
			update: [
				{
					id: SCHEDULE_ID,
					data: {
						client_id: CLIENT_ID,
						service_type_id: 'physical-care',
						staff_ids: [STAFF_ID],
						weekday: 'Mon',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						note: 'updated',
					},
				},
			],
			delete: [],
		});
		expect(result.success).toBe(true);
	});

	it('delete操作を含む入力を受け入れる', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [],
			update: [],
			delete: [SCHEDULE_ID],
		});
		expect(result.success).toBe(true);
	});

	it('無効なUUIDを拒否する', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [],
			update: [],
			delete: ['invalid-uuid'],
		});
		expect(result.success).toBe(false);
	});

	it('無効な時間範囲（開始>終了）を拒否する', () => {
		const result = BatchScheduleOperationSchema.safeParse({
			create: [
				{
					client_id: CLIENT_ID,
					service_type_id: 'physical-care',
					staff_ids: [],
					weekday: 'Mon',
					start_time: { hour: 12, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					note: null,
				},
			],
			update: [],
			delete: [],
		});
		expect(result.success).toBe(false);
	});
});

describe('BatchScheduleResultSchema', () => {
	it('正常な結果を受け入れる', () => {
		const result = BatchScheduleResultSchema.safeParse({
			created: 2,
			updated: 1,
			deleted: 1,
		});
		expect(result.success).toBe(true);
	});

	it('エラー情報を含む結果を受け入れる', () => {
		const result = BatchScheduleResultSchema.safeParse({
			created: 1,
			updated: 0,
			deleted: 0,
			errors: [
				{
					operation: 'create',
					index: 1,
					message: 'Overlapping schedule exists',
				},
			],
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.errors).toHaveLength(1);
		}
	});

	it('負の数を拒否する', () => {
		const result = BatchScheduleResultSchema.safeParse({
			created: -1,
			updated: 0,
			deleted: 0,
		});
		expect(result.success).toBe(false);
	});
});
