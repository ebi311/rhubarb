import { useEffect, useMemo, useState } from 'react';
import type { RoleFilter, StaffPickerOption } from './types';

export type UseStaffPickerDialogStateParams = {
	staffOptions: StaffPickerOption[];
	selectedStaffId: string | null;
	isOpen: boolean;
};

export type UseStaffPickerDialogState = {
	keyword: string;
	roleFilter: RoleFilter;
	serviceFilter: string;
	serviceTypeFilterOptions: string[];
	filteredStaffs: StaffPickerOption[];
	pendingSelection: string | null;
	pendingStaff: StaffPickerOption | null;
	handleKeywordChange: (value: string) => void;
	handleRoleFilterChange: (value: RoleFilter) => void;
	handleServiceFilterChange: (value: string) => void;
	selectStaff: (staffId: string | null) => void;
};

export const useStaffPickerDialogState = ({
	staffOptions,
	selectedStaffId,
	isOpen,
}: UseStaffPickerDialogStateParams): UseStaffPickerDialogState => {
	const [keyword, setKeyword] = useState('');
	const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
	const [serviceFilter, setServiceFilter] = useState<string>('all');
	const [pendingSelection, setPendingSelection] = useState<string | null>(selectedStaffId);

	useEffect(() => {
		setPendingSelection(selectedStaffId);
	}, [selectedStaffId]);

	useEffect(() => {
		if (!isOpen) {
			setKeyword('');
			setRoleFilter('all');
			setServiceFilter('all');
		}
	}, [isOpen]);

	const serviceTypeFilterOptions = useMemo(() => {
		const unique = new Set<string>();
		staffOptions.forEach((option) => {
			option.serviceTypeNames.forEach((name) => unique.add(name));
		});
		return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ja'));
	}, [staffOptions]);

	const filteredStaffs = useMemo(() => {
		const keywordLower = keyword.trim().toLowerCase();
		return staffOptions.filter((option) => {
			const matchesRole = roleFilter === 'all' || option.role === roleFilter;
			const matchesService =
				serviceFilter === 'all' || option.serviceTypeNames.includes(serviceFilter);
			const matchesKeyword =
				keywordLower.length === 0 ||
				option.name.toLowerCase().includes(keywordLower) ||
				option.serviceTypeNames.some((service) => service.toLowerCase().includes(keywordLower));
			return matchesRole && matchesService && matchesKeyword;
		});
	}, [keyword, roleFilter, serviceFilter, staffOptions]);

	const pendingStaff = pendingSelection
		? (staffOptions.find((staff) => staff.id === pendingSelection) ?? null)
		: null;

	return {
		keyword,
		roleFilter,
		serviceFilter,
		serviceTypeFilterOptions,
		filteredStaffs,
		pendingSelection,
		pendingStaff,
		handleKeywordChange: setKeyword,
		handleRoleFilterChange: setRoleFilter,
		handleServiceFilterChange: setServiceFilter,
		selectStaff: setPendingSelection,
	};
};
