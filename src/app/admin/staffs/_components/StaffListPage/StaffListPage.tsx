'use client';

import type { StaffRecord } from '@/models/staffActionSchemas';
import { dateJst } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ServiceTypeOption, StaffFilterState, StaffViewModel } from '../../_types';
import { DeleteStaffDialog } from '../DeleteStaffDialog';
import { StaffFilterBar } from '../StaffFilterBar';
import { StaffFormModal } from '../StaffFormModal';
import { StaffTable } from '../StaffTable';

interface StaffListPageClientProps {
	initialStaffs: StaffRecord[];
	serviceTypes: ServiceTypeOption[];
	filters: StaffFilterState;
}

const formatDateTime = (date: Date) => dateJst(date).format('YYYY-MM-DD HH:mm');

const buildServiceTypeMap = (serviceTypes: ServiceTypeOption[]) => {
	const map = new Map<string, string>();
	serviceTypes.forEach((type) => {
		map.set(type.id, type.name);
	});
	return map;
};

const toViewModel = (staff: StaffRecord, serviceTypeMap: Map<string, string>): StaffViewModel => ({
	id: staff.id,
	name: staff.name,
	role: staff.role,
	email: staff.email ?? null,
	note: staff.note ?? null,
	serviceTypes: staff.service_type_ids.map((serviceTypeId) => ({
		id: serviceTypeId,
		name: serviceTypeMap.get(serviceTypeId) ?? serviceTypeId,
	})),
	updatedAt: formatDateTime(staff.updated_at),
});

export const StaffListPage = ({
	initialStaffs,
	serviceTypes,
	filters,
}: StaffListPageClientProps) => {
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
		() => staffs.map((staff) => toViewModel(staff, serviceTypeMap)),
		[staffs, serviceTypeMap],
	);

	const filteredStaffs = useMemo(() => {
		const keyword = filters.query.trim().toLowerCase();
		return staffViewModels.filter((staff) => {
			const matchesKeyword =
				keyword.length === 0 ||
				staff.name.toLowerCase().includes(keyword) ||
				(staff.email ?? '').toLowerCase().includes(keyword);
			const matchesRole = filters.role === 'all' || staff.role === filters.role;
			return matchesKeyword && matchesRole;
		});
	}, [filters, staffViewModels]);

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
		if (target) {
			setEditingStaff(target);
		}
	};

	const openDeleteDialog = (staffId: string) => {
		const target = staffs.find((staff) => staff.id === staffId);
		if (target) {
			setDeletingStaff({ id: target.id, name: target.name });
		}
	};

	return (
		<section className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold">担当者管理</h1>
					<p className="text-base-content/70 text-sm">
						サービス区分権限と備考情報を含む担当者の一覧です。
					</p>
				</div>
				<button type="button" className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
					＋ 担当者を追加
				</button>
			</div>
			<StaffFilterBar filters={filters} />
			<StaffTable staffs={filteredStaffs} onEdit={openEditModal} onDelete={openDeleteDialog} />
			<StaffFormModal
				isOpen={isCreateModalOpen}
				mode="create"
				serviceTypes={serviceTypes}
				onClose={() => setCreateModalOpen(false)}
				onSuccess={handleCreateSuccess}
			/>
			{editingStaff && (
				<StaffFormModal
					isOpen
					mode="edit"
					staff={editingStaff}
					serviceTypes={serviceTypes}
					onClose={() => setEditingStaff(null)}
					onSuccess={handleEditSuccess}
				/>
			)}
			{deletingStaff && (
				<DeleteStaffDialog
					isOpen
					staff={deletingStaff}
					onClose={() => setDeletingStaff(null)}
					onDeleted={handleDeleteSuccess}
				/>
			)}
		</section>
	);
};
