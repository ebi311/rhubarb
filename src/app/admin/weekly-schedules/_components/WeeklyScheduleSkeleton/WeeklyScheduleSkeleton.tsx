export const WeeklyScheduleSkeleton = () => {
	return (
		<div className="space-y-4">
			{/* WeekSelector skeleton */}
			<div className="flex items-center justify-between">
				<div className="h-10 w-10 skeleton rounded-lg" />
				<div className="h-6 w-48 skeleton" />
				<div className="h-10 w-10 skeleton rounded-lg" />
			</div>

			{/* GenerateButton skeleton */}
			<div className="flex justify-end">
				<div className="h-10 w-32 skeleton rounded-lg" />
			</div>

			{/* Table skeleton */}
			<div className="overflow-x-auto">
				<div className="space-y-2">
					{/* Header */}
					<div className="flex gap-4 border-b border-base-200 pb-2">
						<div className="h-4 w-24 skeleton" />
						<div className="h-4 w-16 skeleton" />
						<div className="h-4 w-32 skeleton" />
						<div className="h-4 w-20 skeleton" />
						<div className="h-4 w-24 skeleton" />
						<div className="h-4 w-16 skeleton" />
						<div className="h-4 w-24 skeleton" />
					</div>
					{/* Rows */}
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 py-3">
							<div className="h-4 w-24 skeleton" />
							<div className="h-4 w-16 skeleton" />
							<div className="h-4 w-32 skeleton" />
							<div className="h-6 w-20 skeleton rounded-full" />
							<div className="h-4 w-24 skeleton" />
							<div className="h-6 w-16 skeleton rounded-full" />
							<div className="h-8 w-24 skeleton rounded-lg" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
