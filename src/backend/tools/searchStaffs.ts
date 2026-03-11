import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
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

/**
 * Tool の構造を表現する型
 * AI SDK に依存しないため、後から AI SDK の tool() 関数でラップ可能
 */
export type SearchStaffsTool = {
	description: string;
	inputSchema: typeof SearchStaffsParametersSchema;
	execute: (params: SearchStaffsParameters) => Promise<SearchStaffsResult>;
};

type CreateSearchStaffsToolOptions = {
	supabase: SupabaseClient<Database>;
	officeId: string;
	/** テスト用の DI */
	staffRepository?: Pick<StaffRepository, 'listByOffice'>;
};

/**
 * スタッフ検索 Tool を作成する
 * AI SDK との統合時は、返り値を ai の tool() 関数でラップして使用可能
 */
export const createSearchStaffsTool = (
	options: CreateSearchStaffsToolOptions,
): SearchStaffsTool => {
	const { supabase, officeId, staffRepository } = options;
	const repo = staffRepository ?? new StaffRepository(supabase);

	return {
		description:
			'スタッフを名前で検索します。名前の部分一致で検索し、最大10件まで返します。',
		inputSchema: SearchStaffsParametersSchema,
		execute: async (
			params: SearchStaffsParameters,
		): Promise<SearchStaffsResult> => {
			const allStaffs = await repo.listByOffice(officeId);

			// 名前で部分一致フィルタリング
			const matchedStaffs = allStaffs
				.filter((staff) => staff.name.includes(params.query))
				.slice(0, MAX_RESULTS)
				.map((staff) => ({
					id: staff.id,
					name: staff.name,
					role: staff.role,
					serviceTypeIds: staff.service_type_ids,
				}));

			return { staffs: matchedStaffs };
		},
	};
};
