'use client';

import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ReactNode } from 'react';
import { Suspense, useCallback, useSyncExternalStore } from 'react';
import { BasicScheduleGrid } from '../BasicScheduleGrid';
import { transformToGridViewModel } from '../BasicScheduleGrid/transformToGridViewModel';
import { BasicScheduleList } from '../BasicScheduleList';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import {
	StaffBasicScheduleGrid,
	transformToStaffGridViewModel,
} from '../StaffBasicScheduleGrid';
import type { ViewMode } from '../ViewToggleButton';
import { ViewToggleButton } from '../ViewToggleButton';

interface BasicScheduleContentProps {
	schedules: BasicScheduleViewModel[];
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
}

const STORAGE_KEY = 'basicScheduleViewMode';

const isValidViewMode = (value: string | null): value is ViewMode => {
	return value === 'list' || value === 'grid' || value === 'staff-grid';
};

const getViewModeFromStorage = (): ViewMode => {
	const savedView = sessionStorage.getItem(STORAGE_KEY);
	return isValidViewMode(savedView) ? savedView : 'list';
};

// SSR時は常に 'list' を返す
const getServerSnapshot = (): ViewMode => 'list';

/** sessionStorage からビューモードを管理するカスタムフック */
const usePersistedViewMode = (): [ViewMode, (newView: ViewMode) => void] => {
	const subscribe = useCallback((onStoreChange: () => void) => {
		// storage イベントを監視（他タブからの変更用）
		window.addEventListener('storage', onStoreChange);
		return () => window.removeEventListener('storage', onStoreChange);
	}, []);

	const viewMode = useSyncExternalStore(
		subscribe,
		getViewModeFromStorage,
		getServerSnapshot,
	);

	const setViewMode = useCallback((newView: ViewMode) => {
		sessionStorage.setItem(STORAGE_KEY, newView);
		// storage イベントは同一タブでは発火しないため、手動でイベントを発火
		window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
	}, []);

	return [viewMode, setViewMode];
};

/** 各表示モードのレンダリング関数マップ */
const viewRenderers: Record<
	ViewMode,
	(
		schedules: BasicScheduleViewModel[],
		options: {
			serviceTypes: ServiceTypeOption[];
			staffs: StaffRecord[];
		},
	) => ReactNode
> = {
	list: (schedules) => <BasicScheduleList schedules={schedules} />,
	grid: (schedules, options) => {
		const gridData = transformToGridViewModel(schedules);
		return (
			<Suspense>
				<BasicScheduleGrid
					schedules={gridData}
					serviceTypes={options.serviceTypes}
					staffs={options.staffs}
				/>
			</Suspense>
		);
	},
	'staff-grid': (schedules) => {
		const staffGridData = transformToStaffGridViewModel(schedules);
		return <StaffBasicScheduleGrid schedules={staffGridData} />;
	},
};

export const BasicScheduleContent = ({
	schedules,
	serviceTypes,
	staffs,
}: BasicScheduleContentProps) => {
	const [viewMode, handleViewChange] = usePersistedViewMode();

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<ViewToggleButton
					currentView={viewMode}
					onViewChange={handleViewChange}
				/>
			</div>
			{viewRenderers[viewMode](schedules, { serviceTypes, staffs })}
		</div>
	);
};
