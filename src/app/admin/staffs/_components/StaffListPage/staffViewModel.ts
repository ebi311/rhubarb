import type { StaffRecord } from '@/models/staffActionSchemas';
import { dateJst } from '@/utils/date';
import type { ServiceTypeOption, StaffFilterState, StaffViewModel } from '../../_types';

export const buildServiceTypeMap = (serviceTypes: ServiceTypeOption[]) => {
	const map = new Map<string, string>();
	serviceTypes.forEach((type) => map.set(type.id, type.name));
	return map;
};

export const formatStaffUpdatedAt = (date: Date) => dateJst(date).format('YYYY-MM-DD HH:mm');

export const toStaffViewModel = (
	staff: StaffRecord,
	serviceTypeMap: Map<string, string>,
): StaffViewModel => ({
	id: staff.id,
	name: staff.name,
	role: staff.role,
	email: staff.email ?? null,
	note: staff.note ?? null,
	serviceTypes: staff.service_type_ids.map((serviceTypeId) => ({
		id: serviceTypeId,
		name: serviceTypeMap.get(serviceTypeId) ?? serviceTypeId,
	})),
	updatedAt: formatStaffUpdatedAt(staff.updated_at),
});

export const filterStaffs = (staffs: StaffViewModel[], filters: StaffFilterState) => {
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
