'use client';

import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ServiceTypeOption, StaffFilterState } from '../../_types';
import { DeleteStaffDialog } from '../DeleteStaffDialog';
import { StaffFilterBar } from '../StaffFilterBar';
import { StaffFormModal } from '../StaffFormModal';
import { StaffTable } from '../StaffTable';
import { StaffListHeader } from './StaffListHeader';
import { useStaffListState } from './useStaffListState';

interface StaffListPageClientProps {
	initialStaffs: StaffRecord[];
	serviceTypes: ServiceTypeOption[];
	filters: StaffFilterState;
}

export const StaffListPage = ({
	initialStaffs,
	serviceTypes,
	filters,
}: StaffListPageClientProps) => {
	const { filteredStaffs, modals, actions, handlers } = useStaffListState({
		initialStaffs,
		serviceTypes,
		filters,
	});

	return (
		<section className="space-y-6">
			<StaffListHeader onCreateRequest={actions.openCreateModal} />
			<StaffFilterBar filters={filters} />
			<StaffTable
				staffs={filteredStaffs}
				onEdit={actions.openEditModal}
				onDelete={actions.openDeleteDialog}
			/>
			<StaffFormModal
				isOpen={modals.isCreateModalOpen}
				mode="create"
				serviceTypes={serviceTypes}
				onClose={actions.closeCreateModal}
				onSuccess={handlers.handleCreateSuccess}
			/>
			{modals.editingStaff && (
				<StaffFormModal
					isOpen
					mode="edit"
					staff={modals.editingStaff}
					serviceTypes={serviceTypes}
					onClose={actions.closeEditModal}
					onSuccess={handlers.handleEditSuccess}
				/>
			)}
			{modals.deletingStaff && (
				<DeleteStaffDialog
					isOpen
					staff={modals.deletingStaff}
					onClose={actions.closeDeleteDialog}
					onDeleted={handlers.handleDeleteSuccess}
				/>
			)}
		</section>
	);
};
