import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

/** 検索結果の最大件数 */
const MAX_RESULTS = 10;

export const SearchStaffsParametersSchema = z.object({
	query: z.string().min(1).max(100).describe('スタッフ名（部分一致）'),
});

export type SearchStaffsParameters = z.infer<
	typeof SearchStaffsParametersSchema
>;

/** 検索結果のスタッフ情報 */
export type SearchStaffItem = {
	id: string;
	name: string;
	role?: string;
	serviceTypeIds?: string[];
};

export type SearchStaffsResult = {
	staffs: SearchStaffItem[];
};

type CreateSearchStaffsToolOptions = {
	supabase: SupabaseClient<Database>;
	officeId: string;
	/** テスト用の DI */
	staffRepository?: Pick<StaffRepository, 'searchByName'>;
};

/**
 * スタッフ検索 Tool を作成する
 * Vercel AI SDK v6 の tool 関数を使用
 */
export const createSearchStaffsTool = (
	options: CreateSearchStaffsToolOptions,
): Tool<SearchStaffsParameters, SearchStaffsResult> => {
	const { supabase, officeId, staffRepository } = options;
	const repo = staffRepository ?? new StaffRepository(supabase);

	return tool({
		description:
			'スタッフを名前で検索します。名前の部分一致で検索し、最大10件まで返します。',
		inputSchema: SearchStaffsParametersSchema,
		execute: async (
			params: SearchStaffsParameters,
		): Promise<SearchStaffsResult> => {
			// DB 側で ilike + limit を使用してケースインセンシティブ検索
			const matchedStaffs = await repo.searchByName(
				officeId,
				params.query,
				MAX_RESULTS,
			);

			return {
				staffs: matchedStaffs.map((staff) => ({
					id: staff.id,
					name: staff.name,
					role: staff.role,
					serviceTypeIds: staff.service_type_ids,
				})),
			};
		},
	});
};
