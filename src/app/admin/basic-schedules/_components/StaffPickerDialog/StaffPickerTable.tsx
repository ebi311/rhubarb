import { ServiceTypeBadges } from '@/app/admin/_components/ServiceTypeBadges';
import classNames from 'classnames';
import type { KeyboardEvent } from 'react';
import type { StaffPickerOption } from './types';

type StaffPickerTableProps = {
	staffs: StaffPickerOption[];
	selectedStaffId: string | null;
	onSelect: (staffId: string) => void;
};

const handleRowKeyDown = (
	event: KeyboardEvent<HTMLDivElement>,
	staffId: string,
	onSelect: (staffId: string) => void,
) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		onSelect(staffId);
	}
};

export const StaffPickerTable = ({
	staffs,
	selectedStaffId,
	onSelect,
}: StaffPickerTableProps) => (
	<ul className="max-h-64 overflow-y-auto">
		{staffs.map((staff) => {
			const isSelected = selectedStaffId === staff.id;
			const rowClassName = classNames(
				'p-2',
				'grid',
				'grid-cols-[auto_1fr_6rem]',
				'grid-areas-["icon_name_role"_"icon_serviceType_serviceType"_"icon_note_note"]',
				'gap-2',
				'rounded border-b border-base-300',
				'cursor-pointer',
				{
					'bg-primary/10': isSelected,
				},
			);
			return (
				<li key={staff.id} role="row" onClick={() => onSelect(staff.id)}>
					<div
						className={rowClassName}
						onKeyDown={(event) => handleRowKeyDown(event, staff.id, onSelect)}
						tabIndex={0}
						aria-selected={isSelected}
					>
						<div className="flex items-center gap-2 grid-area-[icon]">
							<input
								type="radio"
								className="radio radio-sm radio-primary"
								checked={isSelected}
								onChange={() => onSelect(staff.id)}
								aria-label={`${staff.name}を選択`}
							/>
						</div>
						<div className="flex flex-col gap-1 text-lg grid-area-[name]">
							<span className="font-medium">{staff.name}</span>
						</div>
						<div className="text-right grid-area-[role]">
							<span className="badge badge-outline">
								{staff.role === 'admin' ? '管理者' : 'ヘルパー'}
							</span>
						</div>
						<div className="grid-area-[serviceType]">
							<ServiceTypeBadges
								serviceTypeIds={staff.serviceTypeIds}
								size="md"
							/>
						</div>
						<div className="text-sm text-base-content/70 grid-area-[note]">
							{staff.note ?? '-'}
						</div>
					</div>
				</li>
			);
		})}
	</ul>
);
