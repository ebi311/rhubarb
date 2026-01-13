import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';

export type StaffRole = 'admin' | 'helper';
export type RoleFilter = 'all' | StaffRole;

export type StaffPickerOption = {
	id: string;
	name: string;
	role: StaffRole;
	serviceTypeIds: ServiceTypeId[];
	note?: string | null;
};

export type StaffPickerDialogProps = {
	isOpen: boolean;
	staffOptions: StaffPickerOption[];
	selectedStaffId: string | null;
	onClose: () => void;
	onSelect: (staffId: string) => void;
	onClear?: () => void;
};
