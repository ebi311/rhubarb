import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it, vi } from 'vitest';
import {
	buildPreResolvedContextPrompt,
	extractDateFromMessage,
	extractLatestUserMessageText,
	extractStaffSearchQuery,
	resolveDateInWeekRange,
	resolveFlexibleChatContext,
} from './flexibleChatPreResolve';

const WEEK_RANGE = {
	startDate: '2026-06-23',
	endDate: '2026-06-29',
};

describe('flexibleChatPreResolve', () => {
	describe('extractLatestUserMessageText', () => {
		it('parts 形式の最新 user メッセージからテキストを抽出する', () => {
			const text = extractLatestUserMessageText([
				{ role: 'user', content: '古いメッセージ' },
				{
					role: 'assistant',
					content: '了解しました',
				},
				{
					role: 'user',
					parts: [{ type: 'text', text: '6/27 の ヘルパー-01 さんの代わり' }],
				},
			]);

			expect(text).toBe('6/27 の ヘルパー-01 さんの代わり');
		});
	});

	describe('extractStaffSearchQuery', () => {
		it('ヘルパー-01 形式を抽出する', () => {
			expect(
				extractStaffSearchQuery(
					'6/27 の ヘルパー-01 さんの代わりの人を候補をあげてください',
				),
			).toBe('ヘルパー-01');
		});

		it('田中さん形式を抽出する', () => {
			expect(extractStaffSearchQuery('田中さんが欠勤になりました')).toBe(
				'田中',
			);
		});
	});

	describe('extractDateFromMessage', () => {
		it('6/27 を weekRange 内の YYYY-MM-DD に解決する', () => {
			expect(
				extractDateFromMessage(
					'6/27 の ヘルパー-01 さんの代わりの人を候補をあげてください',
					WEEK_RANGE,
				),
			).toBe('2026-06-27');
		});

		it('weekRange 外の日付は null を返す', () => {
			expect(extractDateFromMessage('7/15 のシフト', WEEK_RANGE)).toBeNull();
		});
	});

	describe('resolveDateInWeekRange', () => {
		it('年跨ぎ weekRange でも日付を解決する', () => {
			expect(
				resolveDateInWeekRange(1, 1, {
					startDate: '2025-12-29',
					endDate: '2026-01-04',
				}),
			).toBe('2026-01-01');
		});
	});

	describe('buildPreResolvedContextPrompt', () => {
		it('単一シフト時は追加確認不要の指示を含める', () => {
			const prompt = buildPreResolvedContextPrompt({
				staffSearchQuery: 'ヘルパー-01',
				matchedStaffs: [
					{ staffId: TEST_IDS.STAFF_1, name: 'ヘルパー-01', role: 'helper' },
				],
				extractedDate: '2026-06-27',
				shifts: [
					{
						id: TEST_IDS.SCHEDULE_1,
						date: '2026-06-27',
						startTime: '09:00',
						endTime: '10:00',
						clientId: TEST_IDS.CLIENT_1,
						clientName: '利用者A',
						staffName: 'ヘルパー-01',
						serviceTypeId: 'physical-care',
						serviceTypeLabel: '身体介護',
					},
				],
			});

			expect(prompt).toContain('事前確認済みの情報');
			expect(prompt).toContain('shiftId:');
			expect(prompt).toContain('追加確認は行わないでください');
			expect(prompt).toContain('searchAvailableHelpers');
		});
	});

	describe('resolveFlexibleChatContext', () => {
		it('スタッフ名と日付からシフト情報を取得して prompt を返す', async () => {
			const mockSearchByNameOrKana = vi.fn().mockResolvedValue([
				{
					id: TEST_IDS.STAFF_1,
					name: 'ヘルパー-01',
					role: 'helper',
					kana: null,
					service_type_ids: ['physical-care'],
				},
			]);
			const mockList = vi.fn().mockResolvedValue([
				{
					id: TEST_IDS.SCHEDULE_1,
					client_id: TEST_IDS.CLIENT_1,
					client_name: '利用者A',
					staff_name: 'ヘルパー-01',
					service_type_id: 'physical-care',
					time: {
						start: { hour: 9, minute: 0 },
						end: { hour: 10, minute: 0 },
					},
				},
			]);

			const result = await resolveFlexibleChatContext({
				supabase: {} as never,
				officeId: TEST_IDS.OFFICE_1,
				weekRange: WEEK_RANGE,
				messages: [
					{
						role: 'user',
						content:
							'6/27 の ヘルパー-01 さんの代わりの人を候補をあげてください',
					},
				],
				staffRepository: { searchByNameOrKana: mockSearchByNameOrKana },
				shiftRepository: { list: mockList },
			});

			expect(result).not.toBeNull();
			expect(result?.staffSearchQuery).toBe('ヘルパー-01');
			expect(result?.extractedDate).toBe('2026-06-27');
			expect(result?.shiftCount).toBe(1);
			expect(mockSearchByNameOrKana).toHaveBeenCalledWith(
				TEST_IDS.OFFICE_1,
				'ヘルパー-01',
				10,
			);
			expect(mockList).toHaveBeenCalledWith(
				expect.objectContaining({
					officeId: TEST_IDS.OFFICE_1,
					staffId: TEST_IDS.STAFF_1,
					includeNames: true,
				}),
			);
		});

		it('抽出できないメッセージでは null を返す', async () => {
			const result = await resolveFlexibleChatContext({
				supabase: {} as never,
				officeId: TEST_IDS.OFFICE_1,
				weekRange: WEEK_RANGE,
				messages: [{ role: 'user', content: 'こんにちは' }],
				staffRepository: { searchByNameOrKana: vi.fn() },
				shiftRepository: { list: vi.fn() },
			});

			expect(result).toBeNull();
		});
	});
});
