import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { BasicScheduleRepository } from './basicScheduleRepository';

/**
 * Supabase モック作成ヘルパー
 * - basic_schedule_staff_assignments: select().in() → assignmentRows
 * - basic_schedules: select().in().eq().is() → scheduleRows
 */
const createMockSupabaseClient = (
	assignmentRows: { basic_schedule_id: string }[],
	scheduleRows: Record<string, unknown>[],
) => {
	// basic_schedules 用チェーンモック
	const schedulesChain = {
		select: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		is: vi.fn().mockResolvedValue({ data: scheduleRows, error: null }),
	};

	// basic_schedule_staff_assignments 用チェーンモック
	const assignmentsChain = {
		select: vi.fn().mockReturnThis(),
		in: vi.fn().mockResolvedValue({
			data: assignmentRows,
			error: null,
		}),
	};

	const from = vi.fn((table: string) => {
		if (table === 'basic_schedule_staff_assignments') return assignmentsChain;
		if (table === 'basic_schedules') return schedulesChain;
		throw new Error(`Unexpected table: ${table}`);
	});

	return {
		from,
		_assignmentsChain: assignmentsChain,
		_schedulesChain: schedulesChain,
	} as unknown as SupabaseClient<Database> & {
		_assignmentsChain: typeof assignmentsChain;
		_schedulesChain: typeof schedulesChain;
	};
};

/** 既存スケジュール行を生成するヘルパー */
const makeScheduleRow = (id: string, startTime: string, endTime: string) => ({
	id,
	client_id: TEST_IDS.CLIENT_1,
	service_type_id: 'physical-care',
	day_of_week: 'Mon',
	start_time: startTime,
	end_time: endTime,
	note: null,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	deleted_at: null,
	basic_schedule_staff_assignments: [
		{ staffs: { id: TEST_IDS.STAFF_1, name: 'テストスタッフ' } },
	],
	clients: {
		id: TEST_IDS.CLIENT_1,
		office_id: TEST_IDS.OFFICE_1,
		name: 'テスト利用者',
	},
});

describe('BasicScheduleRepository', () => {
	describe('findOverlaps - 30分インターバル', () => {
		const EXISTING_SCHEDULE_ID = TEST_IDS.SCHEDULE_1;

		// 既存スケジュール: 09:00-10:00
		const existingRow = makeScheduleRow(
			EXISTING_SCHEDULE_ID,
			'09:00:00+09:00',
			'10:00:00+09:00',
		);

		it('30分ちょうど（後ろ）: 既存 09:00-10:00、入力 10:30-11:00 → 競合なし', async () => {
			const mockSupabase = createMockSupabaseClient(
				[{ basic_schedule_id: EXISTING_SCHEDULE_ID }],
				[existingRow],
			);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [TEST_IDS.STAFF_1],
				weekday: 'Mon',
				start_time: '1030',
				end_time: '1100',
			});

			expect(result).toHaveLength(0);
		});

		it('30分未満（後ろ）: 既存 09:00-10:00、入力 10:29-11:00 → 競合あり', async () => {
			const mockSupabase = createMockSupabaseClient(
				[{ basic_schedule_id: EXISTING_SCHEDULE_ID }],
				[existingRow],
			);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [TEST_IDS.STAFF_1],
				weekday: 'Mon',
				start_time: '1029',
				end_time: '1100',
			});

			expect(result).toHaveLength(1);
		});

		it('30分ちょうど（前）: 既存 09:00-10:00、入力 08:00-08:30 → 競合なし', async () => {
			const mockSupabase = createMockSupabaseClient(
				[{ basic_schedule_id: EXISTING_SCHEDULE_ID }],
				[existingRow],
			);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [TEST_IDS.STAFF_1],
				weekday: 'Mon',
				start_time: '0800',
				end_time: '0830',
			});

			expect(result).toHaveLength(0);
		});

		it('30分未満（前）: 既存 09:00-10:00、入力 08:00-08:31 → 競合あり', async () => {
			const mockSupabase = createMockSupabaseClient(
				[{ basic_schedule_id: EXISTING_SCHEDULE_ID }],
				[existingRow],
			);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [TEST_IDS.STAFF_1],
				weekday: 'Mon',
				start_time: '0800',
				end_time: '0831',
			});

			expect(result).toHaveLength(1);
		});

		it('通常の重複: 既存 09:00-10:00、入力 09:30-10:30 → 競合あり', async () => {
			const mockSupabase = createMockSupabaseClient(
				[{ basic_schedule_id: EXISTING_SCHEDULE_ID }],
				[existingRow],
			);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [TEST_IDS.STAFF_1],
				weekday: 'Mon',
				start_time: '0930',
				end_time: '1030',
			});

			expect(result).toHaveLength(1);
		});

		it('staff_ids が空の場合は空配列を返す', async () => {
			const mockSupabase = createMockSupabaseClient([], []);
			const repository = new BasicScheduleRepository(mockSupabase);

			const result = await repository.findOverlaps({
				staff_ids: [],
				weekday: 'Mon',
				start_time: '0900',
				end_time: '1000',
			});

			expect(result).toHaveLength(0);
		});
	});
});
