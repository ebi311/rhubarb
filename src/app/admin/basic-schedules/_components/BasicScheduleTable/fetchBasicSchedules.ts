import type { BasicScheduleFilterState } from '../BasicScheduleFilterBar/types';
import type { BasicScheduleViewModel } from './types';

/** サーバーサイドで基本スケジュールを取得する */
export const fetchBasicSchedules = async (
	_filters: BasicScheduleFilterState,
): Promise<BasicScheduleViewModel[]> => {
	// TODO: 実装
	return [];
};
