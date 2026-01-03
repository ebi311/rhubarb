import type { StaffRecord } from '@/models/staffActionSchemas';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ServiceTypeOption, StaffFilterState } from '../../_types';
import { buildServiceTypeMap, filterStaffs, toStaffViewModel } from './staffViewModel';

type UseStaffListStateOptions = {
	initialStaffs: StaffRecord[];
	serviceTypes: ServiceTypeOption[];
	filters: StaffFilterState;
};

export const useStaffListState = ({
	initialStaffs,
	serviceTypes,
	filters,
}: UseStaffListStateOptions) => {
	const router = useRouter();
	const [staffs, setStaffs] = useState(initialStaffs);
	const [isCreateModalOpen, setCreateModalOpen] = useState(false);
	const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
	const [deletingStaff, setDeletingStaff] = useState<Pick<StaffRecord, 'id' | 'name'> | null>(null);

	useEffect(() => {
		setStaffs(initialStaffs);
	}, [initialStaffs]);

	const serviceTypeMap = useMemo(() => buildServiceTypeMap(serviceTypes), [serviceTypes]);
	const staffViewModels = useMemo(
		() => staffs.map((staff) => toStaffViewModel(staff, serviceTypeMap)),
		[staffs, serviceTypeMap],
	);
	const filteredStaffs = useMemo(
		() => filterStaffs(staffViewModels, filters),
		[staffViewModels, filters],
	);

	const refreshSafely = () => {
		try {
			router.refresh();
		} catch (error) {
			console.error('Failed to refresh staffs after mutation', error);
		}
	};

	const handleCreateSuccess = (staff: StaffRecord) => {
		setStaffs((prev) => [staff, ...prev.filter((item) => item.id !== staff.id)]);
		setCreateModalOpen(false);
		refreshSafely();
	};

	const handleEditSuccess = (staff: StaffRecord) => {
		setStaffs((prev) => prev.map((item) => (item.id === staff.id ? staff : item)));
		setEditingStaff(null);
		refreshSafely();
	};

	const handleDeleteSuccess = (staffId: string) => {
		setStaffs((prev) => prev.filter((item) => item.id !== staffId));
		setDeletingStaff(null);
		refreshSafely();
	};

	const openEditModal = (staffId: string) => {
		const target = staffs.find((staff) => staff.id === staffId);
		if (target) setEditingStaff(target);
	};

	const openDeleteDialog = (staffId: string) => {
		const target = staffs.find((staff) => staff.id === staffId);
		if (target) setDeletingStaff({ id: target.id, name: target.name });
	};

	return {
		filteredStaffs,
		modals: {
			isCreateModalOpen,
			editingStaff,
			deletingStaff,
		},
		actions: {
			openCreateModal: () => setCreateModalOpen(true),
			closeCreateModal: () => setCreateModalOpen(false),
			openEditModal,
			closeEditModal: () => setEditingStaff(null),
			openDeleteDialog,
			closeDeleteDialog: () => setDeletingStaff(null),
		},
		handlers: {
			handleCreateSuccess,
			handleEditSuccess,
			handleDeleteSuccess,
		},
	};
};
