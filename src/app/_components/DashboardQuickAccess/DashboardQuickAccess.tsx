import { Icon } from '@/app/_components/Icon';
import Link from 'next/link';

type QuickAccessItem = {
	href: string;
	iconName: 'calendar_month' | 'calendar_view_week';
	title: string;
	description: string;
};

const quickAccessItems: QuickAccessItem[] = [
	{
		href: '/admin/basic-schedules',
		iconName: 'calendar_month',
		title: '基本スケジュール',
		description: '定期的なシフトパターンを管理',
	},
	{
		href: '/admin/weekly-schedules',
		iconName: 'calendar_view_week',
		title: '週次スケジュール',
		description: '週ごとのシフトを確認・編集',
	},
];

export const DashboardQuickAccess = () => {
	return (
		<section>
			<h2 className="mb-4 text-lg font-semibold">クイックアクセス</h2>
			<div
				className="grid grid-cols-1 gap-4 md:grid-cols-2"
				data-testid="quick-access-grid"
			>
				{quickAccessItems.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						aria-label={`${item.title} - ${item.description}`}
						className="card bg-base-100 shadow-md transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
					>
						<div className="card-body flex-row items-center gap-4">
							<div className="rounded-full bg-primary/10 p-3">
								<Icon name={item.iconName} className="text-2xl text-primary" />
							</div>
							<div>
								<h3 className="card-title text-base">{item.title}</h3>
								<p className="text-sm text-base-content/70">
									{item.description}
								</p>
							</div>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
};
