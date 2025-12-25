import type { StaffViewModel } from '../../_types';

interface StaffTableProps {
	staffs: StaffViewModel[];
	onEdit?: (staffId: string) => void;
	onDelete?: (staffId: string) => void;
}

const roleLabel: Record<StaffViewModel['role'], string> = {
	admin: '管理者',
	helper: 'ヘルパー',
};

const emptyMessage = '該当する担当者がいません';

export const StaffTable = ({ staffs, onEdit, onDelete }: StaffTableProps) => {
	const hasActions = Boolean(onEdit || onDelete);

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
						{hasActions && <th className="w-32 text-right">操作</th>}
					</tr>
				</thead>
				<tbody>
					{staffs.map((staff) => (
						<tr key={staff.id}>
							<td className="font-medium">{staff.name}</td>
							<td>
								<span className="badge badge-outline badge-sm">{roleLabel[staff.role]}</span>
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
							{hasActions && (
								<td>
									<div className="flex flex-wrap justify-end gap-2">
										{onEdit && (
											<button
												type="button"
												className="btn btn-ghost btn-xs"
												onClick={() => onEdit(staff.id)}
											>
												編集
											</button>
										)}
										{onDelete && (
											<button
												type="button"
												className="btn btn-outline btn-error btn-xs"
												onClick={() => onDelete(staff.id)}
											>
												削除
											</button>
										)}
									</div>
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
