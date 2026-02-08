import { describe, expect, it } from 'vitest';
import { BatchSaveOperationsSchema } from './basicScheduleActionSchemas';

const CLIENT_ID = '019b1d20-0000-4000-8000-000000000001';
const SCHEDULE_ID = '019b1d20-0000-4000-8000-000000000002';
const STAFF_ID = '019b1d20-0000-4000-8000-000000000003';

describe('BatchSaveOperationsSchema', () => {
	it('空の操作を受け入れる', () => {
		const result = BatchSaveOperationsSchema.safeParse({
			create: [],
			update: [],
			delete: [],
		});
		expect(result.success).toBe(true);
	});

	it('update操作（inputプロパティ）を含む入力を受け入れる', () => {
		const result = BatchSaveOperationsSchema.safeParse({
			create: [],
			update: [
				{
					id: SCHEDULE_ID,
					input: {
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

	it('無効なUUID（update.id）を拒否する', () => {
		const result = BatchSaveOperationsSchema.safeParse({
			create: [],
			update: [
				{
					id: 'invalid-uuid',
					input: {
						client_id: CLIENT_ID,
						service_type_id: 'physical-care',
						staff_ids: [],
						weekday: 'Mon',
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						note: null,
					},
				},
			],
			delete: [],
		});
		expect(result.success).toBe(false);
	});

	it('無効な時間範囲（create内）を拒否する', () => {
		const result = BatchSaveOperationsSchema.safeParse({
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

	it('無効なUUID（delete）を拒否する', () => {
		const result = BatchSaveOperationsSchema.safeParse({
			create: [],
			update: [],
			delete: ['invalid-uuid'],
		});
		expect(result.success).toBe(false);
	});
});
