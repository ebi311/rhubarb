'use client';

import classNames from 'classnames';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { STAFF_FILTER_ROLES, type StaffFilterState } from '../../_types';

interface StaffFilterBarProps {
	filters: StaffFilterState;
}

const roleLabels: Record<StaffFilterState['role'], string> = {
	all: 'すべて',
	admin: '管理者',
	helper: 'ヘルパー',
};

export const StaffFilterBar = ({ filters }: StaffFilterBarProps) => {
	const router = useRouter();
	const onChange = (newFilters: StaffFilterState) => {
		const params = new URLSearchParams();
		if (newFilters.query.trim() !== '') {
			params.set('query', newFilters.query.trim());
		}
		if (newFilters.role !== 'all') {
			params.set('role', newFilters.role);
		}
		const queryString = params.toString();
		router.replace(`?${queryString}`);
	};
	const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
		onChange({ ...filters, query: event.target.value });
	};

	const handleRoleChange = (role: StaffFilterState['role']) => {
		if (role === filters.role) return;
		onChange({ ...filters, role });
	};

	const handleReset = () => {
		onChange({ query: '', role: 'all' });
	};

	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div className="grow">
				<input
					type="text"
					className="input input-bordered w-full"
					placeholder="氏名・メールで検索"
					value={filters.query}
					onChange={handleQueryChange}
					aria-label="担当者検索"
				/>
			</div>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<div className="join">
					{STAFF_FILTER_ROLES.map((role) => (
						<button
							key={role}
							type="button"
							className={classNames('btn btn-sm join-item', {
								'btn-active btn-primary': filters.role === role,
							})}
							onClick={() => handleRoleChange(role)}
						>
							{roleLabels[role]}
						</button>
					))}
				</div>
				<button type="button" className="btn btn-sm btn-ghost" onClick={handleReset}>
					リセット
				</button>
			</div>
		</div>
	);
};
