import { TEST_IDS } from '@/test/helpers/testIds';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { usePendingAIChatTransition } from './usePendingAIChatTransition';

const sampleShift: ShiftDisplayRow = {
	id: 'shift-1',
	date: new Date('2099-01-19T00:00:00'),
	startTime: { hour: 9, minute: 0 },
	endTime: { hour: 10, minute: 0 },
	clientId: TEST_IDS.CLIENT_1,
	clientName: '田中太郎',
	serviceTypeId: 'physical-care',
	staffId: TEST_IDS.STAFF_1,
	staffName: '山田花子',
	status: 'scheduled',
	isUnassigned: false,
};

const secondShift: ShiftDisplayRow = {
	...sampleShift,
	id: 'shift-2',
	clientId: TEST_IDS.CLIENT_2,
	clientName: '鈴木一郎',
};

describe('usePendingAIChatTransition', () => {
	it('担当者変更ダイアログが閉じた後に pending AI chat を開く', () => {
		vi.useFakeTimers();
		try {
			const setChatDialogShift = vi.fn();
			const { result, rerender } = renderHook(
				({
					changeDialogShift,
				}: {
					changeDialogShift: ShiftDisplayRow | null;
				}) =>
					usePendingAIChatTransition({
						changeDialogShift,
						shifts: [sampleShift, secondShift],
						setChatDialogShift,
					}),
				{
					initialProps: {
						changeDialogShift: sampleShift as ShiftDisplayRow | null,
					},
				},
			);

			act(() => {
				result.current.queuePendingAIChat(sampleShift.id);
			});

			rerender({ changeDialogShift: null });
			expect(setChatDialogShift).not.toHaveBeenCalled();

			act(() => {
				vi.runAllTimers();
			});

			expect(setChatDialogShift).toHaveBeenCalledWith(sampleShift);
		} finally {
			vi.useRealTimers();
		}
	});

	it('別シフトの担当者変更ダイアログを開き直した場合は pending AI chat を破棄する', () => {
		vi.useFakeTimers();
		try {
			const setChatDialogShift = vi.fn();
			const { result, rerender } = renderHook(
				({
					changeDialogShift,
				}: {
					changeDialogShift: ShiftDisplayRow | null;
				}) =>
					usePendingAIChatTransition({
						changeDialogShift,
						shifts: [sampleShift, secondShift],
						setChatDialogShift,
					}),
				{
					initialProps: {
						changeDialogShift: sampleShift as ShiftDisplayRow | null,
					},
				},
			);

			act(() => {
				result.current.queuePendingAIChat(sampleShift.id);
			});

			rerender({ changeDialogShift: secondShift });
			rerender({ changeDialogShift: null });

			act(() => {
				vi.runAllTimers();
			});

			expect(setChatDialogShift).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});
