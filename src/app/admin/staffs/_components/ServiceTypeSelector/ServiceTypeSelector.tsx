'use client';

import type { ServiceTypeOption } from '../../_types';

export interface ServiceTypeSelectorProps {
	options: ServiceTypeOption[];
	selectedIds: string[];
	onChange: (next: string[]) => void;
	disabled?: boolean;
}

export const ServiceTypeSelector = ({
	options,
	selectedIds,
	onChange,
	disabled = false,
}: ServiceTypeSelectorProps) => {
	const selectedSet = new Set(selectedIds);
	const allSelected = options.length > 0 && selectedIds.length === options.length;

	const toggleOption = (id: string) => {
		if (disabled) return;

		if (selectedSet.has(id)) {
			onChange(selectedIds.filter((value) => value !== id));
		} else {
			onChange([...selectedIds, id]);
		}
	};

	const toggleAll = () => {
		if (disabled) return;

		if (allSelected) {
			onChange([]);
		} else {
			onChange(options.map((option) => option.id));
		}
	};

	if (options.length === 0) {
		return (
			<div className="alert alert-warning">
				<span>サービス区分が登録されていません</span>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<p className="text-sm text-base-content/70">
					選択数: {selectedIds.length} / {options.length}
				</p>
				<button type="button" className="btn btn-xs" onClick={toggleAll} disabled={disabled}>
					{allSelected ? '全解除' : '全選択'}
				</button>
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				{options.map((option) => (
					<label
						key={option.id}
						className="label cursor-pointer justify-start gap-3 rounded-box border border-base-200 px-3 py-2"
					>
						<input
							type="checkbox"
							className="checkbox checkbox-primary"
							checked={selectedSet.has(option.id)}
							onChange={() => toggleOption(option.id)}
							disabled={disabled}
							aria-label={option.name}
						/>
						<span className="label-text text-sm">{option.name}</span>
					</label>
				))}
			</div>
		</div>
	);
};
