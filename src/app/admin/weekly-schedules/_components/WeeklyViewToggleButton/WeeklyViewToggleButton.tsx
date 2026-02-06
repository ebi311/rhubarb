'use client';

import { Icon } from '@/app/_components/Icon';
import classNames from 'classnames';

export type WeeklyViewMode = 'list' | 'grid' | 'staff-grid';

interface WeeklyViewToggleButtonProps {
	currentView: WeeklyViewMode;
	onViewChange?: (view: WeeklyViewMode) => void;
}

export const WeeklyViewToggleButton = ({
	currentView,
	onViewChange,
}: WeeklyViewToggleButtonProps) => {
	const handleClick = (view: WeeklyViewMode) => {
		if (onViewChange) {
			onViewChange(view);
		}
	};

	return (
		<div className="join">
			<button
				type="button"
				onClick={() => handleClick('list')}
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'list',
				})}
				aria-label="リスト表示"
			>
				<Icon name="menu" className="text-base" />
			</button>
			<button
				type="button"
				onClick={() => handleClick('grid')}
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'grid',
				})}
				aria-label="利用者別グリッド表示"
			>
				<Icon name="calendar_view_week" className="text-base" />
			</button>
			<button
				type="button"
				onClick={() => handleClick('staff-grid')}
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'staff-grid',
				})}
				aria-label="スタッフ別グリッド表示"
			>
				<Icon name="person_search" className="text-base" />
			</button>
		</div>
	);
};
