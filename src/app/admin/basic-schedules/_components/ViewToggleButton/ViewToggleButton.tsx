import { Icon } from '@/app/_components/Icon';
import classNames from 'classnames';
import Link from 'next/link';

export type ViewMode = 'list' | 'grid' | 'staff-grid';

interface ViewToggleButtonProps {
	currentView: ViewMode;
}

export const ViewToggleButton = ({ currentView }: ViewToggleButtonProps) => {
	return (
		<div className="join">
			<Link
				href="?view=list"
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'list',
				})}
				aria-label="リスト表示"
			>
				<Icon name="menu" className="text-base" />
			</Link>
			<Link
				href="?view=grid"
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'grid',
				})}
				aria-label="利用者別グリッド表示"
			>
				<Icon name="calendar_view_week" className="text-base" />
			</Link>
			<Link
				href="?view=staff-grid"
				className={classNames('btn', 'btn-sm', 'join-item', {
					'btn-active btn-primary': currentView === 'staff-grid',
				})}
				aria-label="スタッフ別グリッド表示"
			>
				<Icon name="person_search" className="text-base" />
			</Link>
		</div>
	);
};
