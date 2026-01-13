import { ServiceTypeBadges } from '@/app/admin/_components/ServiceTypeBadges';
import type { KeyboardEvent } from 'react';
import type { StaffPickerOption } from './types';

type StaffPickerTableProps = {
	staffs: StaffPickerOption[];
	selectedStaffId: string | null;
	onSelect: (staffId: string) => void;
};

const handleRowKeyDown = (
	event: KeyboardEvent<HTMLTableRowElement>,
	staffId: string,
	onSelect: (staffId: string) => void,
) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		onSelect(staffId);
	}
};

export const StaffPickerTable = ({ staffs, selectedStaffId, onSelect }: StaffPickerTableProps) => (
	<table className="table table-zebra">
		<thead>
			<tr>
				<th className="w-12">選択</th>
				<th>氏名</th>
				<th>役割</th>
				<th>サービス区分</th>
				<th>備考</th>
			</tr>
		</thead>
		<tbody>
			{staffs.map((staff) => {
				const isSelected = selectedStaffId === staff.id;
				return (
					<tr
						key={staff.id}
						className={['cursor-pointer', isSelected ? 'bg-primary/10' : ''].join(' ').trim()}
						onClick={() => onSelect(staff.id)}
						onKeyDown={(event) => handleRowKeyDown(event, staff.id, onSelect)}
						tabIndex={0}
						aria-selected={isSelected}
					>
						<td>
							<input
								type="radio"
								className="radio radio-primary"
								checked={isSelected}
								onChange={() => onSelect(staff.id)}
								aria-label={`${staff.name}を選択`}
							/>
						</td>
						<td className="flex flex-col gap-1">
							<span className="font-medium">{staff.name}</span>
						</td>
						<td>
							<span className="badge badge-outline">
								{staff.role === 'admin' ? '管理者' : 'ヘルパー'}
							</span>
						</td>
						<td>
							<ServiceTypeBadges serviceTypeIds={staff.serviceTypeIds} size="md" />
						</td>
						<td className="text-sm text-base-content/70">{staff.note ?? '-'}</td>
					</tr>
				);
			})}
		</tbody>
	</table>
);
