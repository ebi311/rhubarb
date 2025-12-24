import type { StaffViewModel } from '../../_types';

interface StaffTableProps {
	staffs: StaffViewModel[];
}

const roleLabel: Record<StaffViewModel['role'], string> = {
	admin: '管理者',
	helper: 'ヘルパー',
};

const emptyMessage = '該当する担当者がいません';

export const StaffTable = ({ staffs }: StaffTableProps) => {
	if (staffs.length === 0) {
		return (
			<div className="alert alert-info" role="status">
				<span>{emptyMessage}</span>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-box border border-base-200">
			<table className="table table-zebra">
				<thead>
					<tr>
						<th>氏名</th>
						<th>ロール</th>
						<th>メール</th>
						<th>担当サービス区分</th>
						<th>備考</th>
						<th>更新日時</th>
					</tr>
				</thead>
				<tbody>
					{staffs.map((staff) => (
						<tr key={staff.id}>
							<td className="font-medium">{staff.name}</td>
							<td>
								<span className="badge badge-outline">{roleLabel[staff.role]}</span>
							</td>
							<td>{staff.email ?? '―'}</td>
							<td>
								<div className="flex flex-wrap gap-2">
									{staff.serviceTypes.length === 0 && (
										<span className="text-base-content/60">未割当</span>
									)}
									{staff.serviceTypes.map((serviceType) => (
										<span key={serviceType.id} className="badge badge-primary badge-outline">
											{serviceType.name}
										</span>
									))}
								</div>
							</td>
							<td>{staff.note ?? '―'}</td>
							<td>{staff.updatedAt}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
