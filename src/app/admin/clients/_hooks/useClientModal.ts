import type { ServiceUser } from '@/models/serviceUser';
import { useRouter } from 'next/navigation';
import type { FilterStatus } from '../_types';

export const useClientModal = (filter: FilterStatus) => {
	const router = useRouter();

	const openCreate = () => {
		router.push(`/admin/clients?filter=${filter}&modal=create`);
	};

	const getEditHref = (client: ServiceUser) => {
		return `/admin/clients?filter=${filter}&modal=edit&id=${client.id}`;
	};

	const close = () => {
		router.push(`/admin/clients?filter=${filter}`);
	};

	return { openCreate, getEditHref, close };
};
