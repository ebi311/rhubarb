import type { StaffRecord } from '@/models/staffActionSchemas';
import { describe, expect, it } from 'vitest';
import type { StaffFilterState } from '../../_types';
import { filterStaffs, formatStaffUpdatedAt, toStaffViewModel } from './staffViewModel';

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

describe('staffViewModel utilities', () => {
	it('formatStaffUpdatedAt returns formatted timestamp', () => {
		const formatted = formatStaffUpdatedAt(new Date('2025-01-02T09:00:00Z'));
		expect(formatted).toBe('2025-01-02 18:00');
	});

	it('toStaffViewModel maps staff record to view model with serviceTypeIds', () => {
		const vm = toStaffViewModel(buildStaff());
		expect(vm.serviceTypeIds).toEqual(['physical-care']);
		expect(vm.name).toBe('山田太郎');
		expect(vm.role).toBe('admin');
	});

	it('filterStaffs filters by query and role', () => {
		const viewModels = [
			toStaffViewModel(buildStaff()),
			toStaffViewModel(
				buildStaff({ id: 'staff-2', name: '佐藤花子', role: 'helper', email: 'sato@example.com' }),
			),
		];

		const filters: StaffFilterState = { query: '花子', role: 'helper' };
		const result = filterStaffs(viewModels, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('佐藤花子');
	});
});
