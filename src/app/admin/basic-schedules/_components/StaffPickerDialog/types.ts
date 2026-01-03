export type StaffRole = 'admin' | 'helper';
export type RoleFilter = 'all' | StaffRole;

export type StaffPickerOption = {
	id: string;
	name: string;
	role: StaffRole;
	serviceTypeNames: string[];
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
