import type { StaffRecord } from '@/models/staffActionSchemas';

export type ServiceTypeOption = {
	id: string;
	name: string;
};

export type StaffViewModel = {
	id: string;
	name: string;
	role: StaffRecord['role'];
	email: string | null;
	note: string | null;
	serviceTypes: ServiceTypeOption[];
	updatedAt: string;
};

export const STAFF_FILTER_ROLES = ['all', 'admin', 'helper'] as const;

export type StaffFilterRole = (typeof STAFF_FILTER_ROLES)[number];

export type StaffFilterState = {
	query: string;
	role: StaffFilterRole;
};

export const convertStaffFilterRole = (val: string | null | undefined) => {
	if (STAFF_FILTER_ROLES.includes(val as StaffFilterRole)) {
		return val as StaffFilterRole;
	}
	return 'all';
};
