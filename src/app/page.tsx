import { Dashboard } from '@/app/_components/Dashboard';
import { getDashboardDataAction } from '@/app/actions/dashboard';
import { Suspense } from 'react';

const DashboardLoading = () => (
	<div className="container mx-auto space-y-6 p-4">
		{/* 統計カード skeleton */}
		<div className="stats w-full stats-vertical shadow sm:stats-horizontal">
			<div className="stat">
				<div className="mb-2 h-4 w-20 skeleton" />
				<div className="h-8 w-12 skeleton" />
			</div>
			<div className="stat">
				<div className="mb-2 h-4 w-20 skeleton" />
				<div className="h-8 w-12 skeleton" />
			</div>
			<div className="stat">
				<div className="mb-2 h-4 w-20 skeleton" />
				<div className="h-8 w-12 skeleton" />
			</div>
		</div>
		{/* タイムライン skeleton */}
		<div className="card bg-base-200">
			<div className="card-body space-y-2">
				<div className="h-6 w-40 skeleton" />
				<div className="h-16 w-full skeleton" />
				<div className="h-16 w-full skeleton" />
			</div>
		</div>
	</div>
);

const DashboardContent = async () => {
	const result = await getDashboardDataAction();

	if (result.error || !result.data) {
		return (
			<div className="container mx-auto p-4">
				<div role="alert" className="alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>
						データの取得に失敗しました: {result.error ?? '不明なエラー'}
					</span>
				</div>
			</div>
		);
	}

	return <Dashboard data={result.data} />;
};

export default function Home() {
	return (
		<main>
			<Suspense fallback={<DashboardLoading />}>
				<DashboardContent />
			</Suspense>
		</main>
	);
}
