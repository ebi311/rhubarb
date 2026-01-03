import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StaffPickerOption } from './types';
import { useStaffPickerDialogState } from './useStaffPickerDialogState';

const staffOptions: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'admin',
		serviceTypeNames: ['身体介護'],
		note: null,
	},
	{
		id: 'staff-2',
		name: '佐藤花子',
		role: 'helper',
		serviceTypeNames: ['生活援助'],
		note: null,
	},
];

type HookProps = {
	staffOptions: StaffPickerOption[];
	selectedStaffId: string | null;
	isOpen: boolean;
};

describe('useStaffPickerDialogState', () => {
	it('フィルタ変更で絞り込み、選択状態を管理する', () => {
		const initialProps: HookProps = { staffOptions, selectedStaffId: null, isOpen: true };
		const { result, rerender } = renderHook(
			(props: HookProps) => useStaffPickerDialogState(props),
			{
				initialProps,
			},
		);

		act(() => {
			result.current.handleKeywordChange('花子');
		});
		expect(result.current.filteredStaffs).toHaveLength(1);
		expect(result.current.filteredStaffs[0].id).toBe('staff-2');

		act(() => {
			result.current.selectStaff('staff-1');
		});
		expect(result.current.pendingSelection).toBe('staff-1');

		rerender({ staffOptions, selectedStaffId: 'staff-2', isOpen: true });
		expect(result.current.pendingSelection).toBe('staff-2');

		rerender({ staffOptions, selectedStaffId: 'staff-2', isOpen: false });
		expect(result.current.keyword).toBe('');
		expect(result.current.roleFilter).toBe('all');
	});
});
