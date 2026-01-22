import type { StaffRecord } from '@/models/staffActionSchemas';
import { dateJst } from '@/utils/date';
import type { StaffFilterState, StaffViewModel } from '../../_types';

export const formatStaffUpdatedAt = (date: Date) =>
	dateJst(date).format('YYYY-MM-DD HH:mm');

export const toStaffViewModel = (staff: StaffRecord): StaffViewModel => ({
	id: staff.id,
	name: staff.name,
	role: staff.role,
	email: staff.email ?? null,
	note: staff.note ?? null,
	serviceTypeIds: staff.service_type_ids,
	updatedAt: formatStaffUpdatedAt(staff.updated_at),
});

export const filterStaffs = (
	staffs: StaffViewModel[],
	filters: StaffFilterState,
) => {
	const keyword = filters.query.trim().toLowerCase();
	return staffs.filter((staff) => {
		const matchesKeyword =
			keyword.length === 0 ||
			staff.name.toLowerCase().includes(keyword) ||
			(staff.email ?? '').toLowerCase().includes(keyword);
		const matchesRole = filters.role === 'all' || staff.role === filters.role;
		return matchesKeyword && matchesRole;
	});
};
