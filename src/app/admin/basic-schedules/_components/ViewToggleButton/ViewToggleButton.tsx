import { Icon } from '@/app/_components/Icon';
import classNames from 'classnames';
import Link from 'next/link';

export type ViewMode = 'list' | 'grid';

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
				aria-label="グリッド表示"
			>
				<Icon name="calendar_view_week" className="text-base" />
			</Link>
		</div>
	);
};
