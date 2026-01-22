import type { StaffRecord } from '@/models/staffActionSchemas';
import { act, renderHook } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffFilterState } from '../../_types';
import { useStaffListState } from './useStaffListState';

vi.mock('next/navigation');

const buildStaff = (overrides: Partial<StaffRecord> = {}): StaffRecord => ({
	id: 'staff-1',
	office_id: 'office-1',
	auth_user_id: null,
	name: '山田太郎',
	role: 'admin',
	email: 'yamada@example.com',
	note: null,
	service_type_ids: ['physical-care'],
	created_at: new Date('2025-01-01T00:00:00Z'),
	updated_at: new Date('2025-01-01T00:00:00Z'),
	...overrides,
});

const setup = (overrides: Partial<{ filters: StaffFilterState }> = {}) => {
	const filters: StaffFilterState = {
		query: '',
		role: 'all',
		...overrides.filters,
	};
	const initialStaffs = [
		buildStaff(),
		buildStaff({
			id: 'staff-2',
			name: '佐藤花子',
			role: 'helper',
			email: 'sato@example.com',
		}),
	];
	return renderHook(() =>
		useStaffListState({
			initialStaffs,
			filters,
		}),
	);
};

const refreshMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	refreshMock.mockReset();
	vi.mocked(useRouter).mockReturnValue({ refresh: refreshMock } as any);
});

describe('useStaffListState', () => {
	it('returns filtered staff view models by query and role', () => {
		const { result } = setup({ filters: { query: '花子', role: 'helper' } });
		expect(result.current.filteredStaffs).toHaveLength(1);
		expect(result.current.filteredStaffs[0].name).toBe('佐藤花子');
	});

	it('handles create success by prepending staff and closing modal', () => {
		const { result } = setup();
		act(() => {
			result.current.actions.openCreateModal();
		});
		act(() => {
			result.current.handlers.handleCreateSuccess(
				buildStaff({
					id: 'staff-created',
					name: '新規担当者',
					updated_at: new Date('2025-01-02T00:00:00Z'),
				}),
			);
		});
		expect(result.current.modals.isCreateModalOpen).toBe(false);
		expect(result.current.filteredStaffs[0].name).toBe('新規担当者');
		expect(refreshMock).toHaveBeenCalled();
	});

	it('handles edit and delete success with refresh', () => {
		const { result } = setup();
		act(() => {
			result.current.actions.openEditModal('staff-1');
		});
		expect(result.current.modals.editingStaff?.id).toBe('staff-1');
		act(() => {
			result.current.handlers.handleEditSuccess(
				buildStaff({ name: '山田太郎（更新）' }),
			);
		});
		expect(result.current.modals.editingStaff).toBeNull();
		expect(result.current.filteredStaffs[0].name).toBe('山田太郎（更新）');

		act(() => {
			result.current.actions.openDeleteDialog('staff-2');
		});
		expect(result.current.modals.deletingStaff?.id).toBe('staff-2');
		act(() => {
			result.current.handlers.handleDeleteSuccess('staff-2');
		});
		expect(result.current.modals.deletingStaff).toBeNull();
		expect(
			result.current.filteredStaffs.find((s) => s.id === 'staff-2'),
		).toBeUndefined();
		expect(refreshMock).toHaveBeenCalledTimes(2);
	});
});
