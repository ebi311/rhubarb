import type { StaffRecord } from '@/models/staffActionSchemas';

type StaffSelectionSummaryProps = {
	staff: StaffRecord | null;
};

export const StaffSelectionSummary = ({ staff }: StaffSelectionSummaryProps) => {
	if (!staff) {
		return (
			<p className="rounded-box border border-dashed border-base-200 p-4 text-sm text-base-content/70">
				担当者は未選択です。
			</p>
		);
	}

	return (
		<div className="rounded-box border border-base-200 bg-base-100 p-4">
			<p className="text-base font-semibold">{staff.name}</p>
			<p className="text-sm text-base-content/70">
				{staff.role === 'admin' ? '管理者' : 'ヘルパー'}
			</p>
			<p className="text-sm text-base-content/70">{staff.note ?? '備考は登録されていません'}</p>
		</div>
	);
};
