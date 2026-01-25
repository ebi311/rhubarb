'use client';

import { FormSelect } from '@/components/forms/FormSelect';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { WEEKDAYS, WEEKDAY_FULL_LABELS } from '@/models/valueObjects/dayOfWeek';
import classNames from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { parseFiltersFromSearchParams } from '../../parseFiltersFromParams';
import type {
	BasicScheduleFilterState,
	ClientOption,
	ServiceTypeOption,
} from './types';

interface BasicScheduleFilterBarProps {
	clients: ClientOption[];
	serviceTypes: ServiceTypeOption[];
}

const labeledControlClassNames = classNames(
	'form-control',
	'flex',
	'flex-col',
	'md:flex-row',
	'w-full',
	'gap-1',
	'md:w-auto',
);

export const BasicScheduleFilterBar = ({
	clients,
	serviceTypes,
}: BasicScheduleFilterBarProps) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const filters = parseFiltersFromSearchParams(searchParams);

	const weekdayOptions = [
		{ value: '', label: 'すべて' },
		...WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_FULL_LABELS[day] })),
	];

	const clientOptions = [
		{ value: '', label: 'すべて' },
		...clients.map((client) => ({ value: client.id, label: client.name })),
	];

	const serviceTypeOptions = [
		{ value: '', label: 'すべて' },
		...serviceTypes.map((serviceType) => ({
			value: serviceType.id,
			label: serviceType.name,
		})),
	];

	const updateFilters = (newFilters: BasicScheduleFilterState) => {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(newFilters)) {
			if (value) {
				params.set(key, value);
			}
		}
		router.replace(`?${params.toString()}`);
	};

	const handleWeekdayChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const value = event.target.value as DayOfWeek | '';
		updateFilters({ ...filters, weekday: value || undefined });
	};

	const handleClientChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const value = event.target.value;
		updateFilters({ ...filters, clientId: value || undefined });
	};

	const handleServiceTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const value = event.target
			.value as BasicScheduleFilterState['serviceTypeId'];
		updateFilters({ ...filters, serviceTypeId: value || undefined });
	};

	const handleReset = () => {
		updateFilters({
			weekday: undefined,
			clientId: undefined,
			serviceTypeId: undefined,
		});
	};

	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div className="flex flex-col gap-3 md:flex-row md:items-end">
				<label className={labeledControlClassNames}>
					<span className="label-text label">曜日</span>
					<FormSelect
						className="select-bordered select w-full md:w-32"
						value={filters.weekday ?? ''}
						onChange={handleWeekdayChange}
						aria-label="曜日"
						options={weekdayOptions}
					/>
				</label>

				<label className={labeledControlClassNames}>
					<span className="label-text label">利用者</span>
					<FormSelect
						className="select-bordered select w-full md:w-48"
						value={filters.clientId ?? ''}
						onChange={handleClientChange}
						aria-label="利用者"
						options={clientOptions}
					/>
				</label>

				<label className={labeledControlClassNames}>
					<span className="label-text label">サービス区分</span>
					<FormSelect
						className="select-bordered select w-full md:w-40"
						value={filters.serviceTypeId ?? ''}
						onChange={handleServiceTypeChange}
						aria-label="サービス区分"
						options={serviceTypeOptions}
					/>
				</label>
			</div>

			<button
				type="button"
				className="btn btn-ghost btn-sm"
				onClick={handleReset}
			>
				リセット
			</button>
		</div>
	);
};
