import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FilterStatus } from '../_types';

export const useClientFilter = (initialFilter: FilterStatus) => {
	const router = useRouter();
	const [filter, setFilter] = useState<FilterStatus>(initialFilter);

	const changeFilter = (newFilter: FilterStatus) => {
		setFilter(newFilter);
		router.push(`/admin/clients?filter=${newFilter}`);
	};

	return { filter, changeFilter };
};
