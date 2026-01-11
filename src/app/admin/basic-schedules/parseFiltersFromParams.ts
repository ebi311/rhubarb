import {
	BasicScheduleFilterSchema,
	type BasicScheduleFilterState,
} from './_components/BasicScheduleFilterBar/types';

/** URLSearchParamsから BasicScheduleFilterState にパースする */
export const parseFiltersFromSearchParams = (
	searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): BasicScheduleFilterState => {
	let unParsedParam = {};
	if (searchParams instanceof URLSearchParams) {
		unParsedParam = {
			weekday: searchParams.get('weekday') ?? undefined,
			clientId: searchParams.get('clientId') ?? undefined,
			serviceTypeId: searchParams.get('serviceTypeId') ?? undefined,
		};
	} else {
		unParsedParam = searchParams;
	}

	const result = BasicScheduleFilterSchema.safeParse(unParsedParam);

	if (!result.success) {
		return {};
	}

	return result.data;
};
