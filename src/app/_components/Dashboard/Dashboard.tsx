'use client';

import { DashboardAlerts } from '@/app/_components/DashboardAlerts';
import { DashboardQuickAccess } from '@/app/_components/DashboardQuickAccess';
import { DashboardStats } from '@/app/_components/DashboardStats';
import { DashboardTimeline } from '@/app/_components/DashboardTimeline';
import type { DashboardData } from '@/models/dashboardActionSchemas';
import { useContext, useEffect } from 'react';
import { pageDispatchContext } from '../Header/context';

type Props = {
	data: DashboardData;
};

export const Dashboard = ({ data }: Props) => {
	const { stats, timeline, alerts } = data;
	const { dispatch } = useContext(pageDispatchContext);
	useEffect(() => {
		dispatch({ type: 'SET_TITLE', payload: 'ダッシュボード' });
	}, [dispatch]);

	return (
		<div
			className="container mx-auto space-y-6 p-4"
			data-testid="dashboard-container"
		>
			{/* 統計カードセクション */}
			<section>
				<DashboardStats {...stats} />
			</section>

			{/* クイックアクセス */}
			<DashboardQuickAccess />

			{/* 今日のタイムライン */}
			<DashboardTimeline timeline={timeline} />

			{/* アラートセクション */}
			<DashboardAlerts alerts={alerts} />
		</div>
	);
};
