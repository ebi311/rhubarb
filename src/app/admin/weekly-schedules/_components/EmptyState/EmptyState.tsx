export interface EmptyStateProps {
	weekStartDate: Date;
	onGenerate: () => void;
}

export const EmptyState = ({ onGenerate }: EmptyStateProps) => {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="text-4xl">📅</div>
			<p className="text-lg text-base-content/70">この週のシフトはまだありません</p>
			<button type="button" className="btn btn-primary" onClick={onGenerate}>
				基本スケジュールから生成
			</button>
		</div>
	);
};
