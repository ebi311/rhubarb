import { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import { SupabaseClient } from '@supabase/supabase-js';
import type { ToolExecutionOptions } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGetShiftsTool, GetShiftsParametersSchema } from './getShifts';

const { mockList } = vi.hoisted(() => ({
	mockList: vi.fn(),
}));

vi.mock('@/backend/repositories/shiftRepository', () => ({
	ShiftRepository: function MockShiftRepository() {
		return {
			list: mockList,
		};
	},
}));

describe('getShifts tool', () => {
	const mockSupabase = {} as SupabaseClient<Database>;

	const baseToolOptions = {
		toolCallId: 'test-call-id',
		messages: [],
		abortSignal: new AbortController().signal,
		context: { officeId: TEST_IDS.OFFICE_1 },
	};

	beforeEach(() => {
		mockList.mockReset();
	});

	it('正しいパラメータをパースできる', () => {
		const result = GetShiftsParametersSchema.safeParse({
			date: '2026-02-25',
			staffId: TEST_IDS.STAFF_1,
		});
		expect(result.success).toBe(true);
	});

	it('不正な日付形式を拒否する', () => {
		const result = GetShiftsParametersSchema.safeParse({
			date: '2026/02/25',
		});
		expect(result.success).toBe(false);
	});

	it('execute が ShiftRepository.list を呼び出して結果を返す', async () => {
		mockList.mockResolvedValueOnce([
			{
				id: TEST_IDS.SCHEDULE_1,
				client_id: TEST_IDS.CLIENT_1,
				service_type_id: 'life-support',
				staff_id: TEST_IDS.STAFF_1,
				date: new Date('2026-02-25T00:00:00+09:00'),
				time: {
					start: { hour: 9, minute: 0 },
					end: { hour: 10, minute: 0 },
				},
				status: 'scheduled',
				is_unassigned: false,
				created_at: new Date('2026-02-24T00:00:00+09:00'),
				updated_at: new Date('2026-02-24T00:00:00+09:00'),
			},
		]);

		const tool = createGetShiftsTool({ supabase: mockSupabase });
		const result = await tool.execute!(
			{ date: '2026-02-25', staffId: TEST_IDS.STAFF_1 },
			baseToolOptions,
		);

		expect(mockList).toHaveBeenCalledWith({
			officeId: TEST_IDS.OFFICE_1,
			date: '2026-02-25',
			staffId: TEST_IDS.STAFF_1,
		});
		expect(result).toEqual({
			shifts: [
				{
					id: TEST_IDS.SCHEDULE_1,
					clientId: TEST_IDS.CLIENT_1,
					clientName: '不明',
					staffId: TEST_IDS.STAFF_1,
					staffName: '不明',
					serviceType: 'life-support',
					startAt: '2026-02-25T00:00:00.000Z',
					endAt: '2026-02-25T01:00:00.000Z',
					status: 'scheduled',
				},
			],
		});
	});

	it('staffId 省略時も取得できる', async () => {
		mockList.mockResolvedValueOnce([]);
		const tool = createGetShiftsTool({ supabase: mockSupabase });

		await tool.execute!({ date: '2026-02-25' }, baseToolOptions);

		expect(mockList).toHaveBeenCalledWith({
			officeId: TEST_IDS.OFFICE_1,
			date: '2026-02-25',
		});
	});

	it('options.context.officeId がない場合はエラー', async () => {
		const tool = createGetShiftsTool({ supabase: mockSupabase });

		const toolOptionsWithoutOffice = {
			...baseToolOptions,
			context: {},
		} as ToolExecutionOptions & { context?: { officeId?: string } };

		await expect(
			tool.execute!({ date: '2026-02-25' }, toolOptionsWithoutOffice),
		).rejects.toThrow('officeId is required in tool context');
	});
});
