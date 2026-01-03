'use client';

import { StaffPickerFilters } from './StaffPickerFilters';
import { StaffPickerFooter } from './StaffPickerFooter';
import { StaffPickerTable } from './StaffPickerTable';
import type { RoleFilter, StaffPickerDialogProps } from './types';
import { useStaffPickerDialogState } from './useStaffPickerDialogState';
export type { RoleFilter, StaffPickerDialogProps, StaffPickerOption, StaffRole } from './types';

const ROLE_FILTERS: Array<{ label: string; value: RoleFilter }> = [
	{ label: 'すべて', value: 'all' },
	{ label: '管理者', value: 'admin' },
	{ label: 'ヘルパー', value: 'helper' },
];

export const StaffPickerDialog = ({
	isOpen,
	staffOptions,
	selectedStaffId,
	onClose,
	onSelect,
	onClear,
}: StaffPickerDialogProps) => {
	const {
		keyword,
		roleFilter,
		serviceFilter,
		serviceTypeFilterOptions,
		filteredStaffs,
		pendingSelection,
		pendingStaff,
		handleKeywordChange,
		handleRoleFilterChange,
		handleServiceFilterChange,
		selectStaff,
	} = useStaffPickerDialogState({ staffOptions, selectedStaffId, isOpen });

	const dialogClasses = ['modal', 'modal-bottom', 'sm:modal-middle', isOpen ? 'modal-open' : '']
		.join(' ')
		.trim();

	const handleConfirm = () => {
		if (pendingSelection) {
			onSelect(pendingSelection);
		}
	};

	const handleRowSelect = (staffId: string) => {
		selectStaff(staffId);
	};

	const handleClearSelection = () => {
		selectStaff(null);
		onClear?.();
	};

	if (!isOpen) return null;

	return (
		<div role="dialog" className={dialogClasses} aria-modal="true">
			<div className="modal-box max-w-4xl">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h2 className="text-xl font-semibold">担当者を選択</h2>
						<p className="text-base-content/70 text-sm">
							検索・フィルタで許可された担当者を絞り込み、1 名を選択してください。
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={onClose}
					>
						✕
					</button>
				</div>

				<StaffPickerFilters
					keyword={keyword}
					roleFilter={roleFilter}
					serviceFilter={serviceFilter}
					serviceTypeOptions={serviceTypeFilterOptions}
					roleFilterOptions={ROLE_FILTERS}
					onKeywordChange={handleKeywordChange}
					onRoleFilterChange={handleRoleFilterChange}
					onServiceFilterChange={handleServiceFilterChange}
					onClear={onClear ? handleClearSelection : undefined}
				/>

				<div className="mt-4 max-h-80 overflow-auto rounded border border-base-200">
					{filteredStaffs.length === 0 ? (
						<div className="alert alert-info rounded-none">
							候補が見つかりません。検索条件を変更してください。
						</div>
					) : (
						<StaffPickerTable
							staffs={filteredStaffs}
							selectedStaffId={pendingSelection}
							onSelect={handleRowSelect}
						/>
					)}
				</div>

				<StaffPickerFooter
					pendingStaff={pendingStaff}
					onClose={onClose}
					onConfirm={handleConfirm}
					confirmDisabled={!pendingSelection}
				/>
			</div>
			<div className="modal-backdrop bg-black/40" onClick={onClose} />
		</div>
	);
};
