import { useCallback, useEffect, useRef } from 'react';
import type { ShiftDisplayRow } from '../ShiftTable';

export const findShiftById = (
	shifts: ShiftDisplayRow[],
	shiftId: string | null,
): ShiftDisplayRow | null => {
	if (shiftId === null) {
		return null;
	}

	return shifts.find((shift) => shift.id === shiftId) ?? null;
};

type UsePendingAIChatTransitionParams = {
	changeDialogShift: ShiftDisplayRow | null;
	shifts: ShiftDisplayRow[];
	setChatDialogShift: (shift: ShiftDisplayRow | null) => void;
};

export const usePendingAIChatTransition = ({
	changeDialogShift,
	shifts,
	setChatDialogShift,
}: UsePendingAIChatTransitionParams) => {
	const pendingAIChatShiftIdRef = useRef<string | null>(null);

	const queuePendingAIChat = useCallback((shiftId: string) => {
		pendingAIChatShiftIdRef.current = shiftId;
	}, []);

	useEffect(() => {
		if (changeDialogShift !== null) {
			pendingAIChatShiftIdRef.current = null;
			return;
		}

		const pendingShiftId = pendingAIChatShiftIdRef.current;
		if (pendingShiftId === null) {
			return;
		}

		pendingAIChatShiftIdRef.current = null;

		const timerId = window.setTimeout(() => {
			setChatDialogShift(findShiftById(shifts, pendingShiftId));
		}, 0);

		return () => {
			window.clearTimeout(timerId);
		};
	}, [changeDialogShift, setChatDialogShift, shifts]);

	return {
		queuePendingAIChat,
	};
};
