import type { StaffRecord } from '@/models/staffActionSchemas';
import { describe, expect, it } from 'vitest';
import type { ServiceTypeOption, StaffFilterState } from '../../_types';
import {
	buildServiceTypeMap,
	filterStaffs,
	formatStaffUpdatedAt,
	toStaffViewModel,
} from './staffViewModel';

const buildStaff = (overrides: Partial<StaffRecord> = {}): StaffRecord => ({
	id: 'staff-1',
	office_id: 'office-1',
	auth_user_id: null,
	name: '山田太郎',
	role: 'admin',
	email: 'yamada@example.com',
	note: '備考',
	service_type_ids: ['physical-care'],
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-02T12:34:00Z'),
	...overrides,
});

const serviceTypes: ServiceTypeOption[] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
];

describe('staffViewModel utilities', () => {
	it('formatStaffUpdatedAt returns formatted timestamp', () => {
		const formatted = formatStaffUpdatedAt(new Date('2025-01-02T09:00:00Z'));
		expect(formatted).toBe('2025-01-02 18:00');
	});

	it('toStaffViewModel resolves service type names via map', () => {
		const map = buildServiceTypeMap(serviceTypes);
		const vm = toStaffViewModel(buildStaff(), map);
		expect(vm.serviceTypes[0]).toEqual({ id: 'physical-care', name: '身体介護' });
		const fallback = toStaffViewModel(buildStaff({ service_type_ids: ['unknown' as any] }), map);
		expect(fallback.serviceTypes[0]).toEqual({ id: 'unknown', name: 'unknown' });
	});

	it('filterStaffs filters by query and role', () => {
		const map = buildServiceTypeMap(serviceTypes);
		const viewModels = [
			toStaffViewModel(buildStaff(), map),
			toStaffViewModel(
				buildStaff({ id: 'staff-2', name: '佐藤花子', role: 'helper', email: 'sato@example.com' }),
				map,
			),
		];

		const filters: StaffFilterState = { query: '花子', role: 'helper' };
		const result = filterStaffs(viewModels, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('佐藤花子');
	});
});
