import { FormSelect } from '@/components/forms/FormSelect';
import type { RoleFilter } from './types';

type StaffPickerFiltersProps = {
	keyword: string;
	roleFilter: RoleFilter;
	serviceFilter: string;
	serviceTypeOptions: string[];
	roleFilterOptions: Array<{ label: string; value: RoleFilter }>;
	onKeywordChange: (value: string) => void;
	onRoleFilterChange: (value: RoleFilter) => void;
	onServiceFilterChange: (value: string) => void;
	onClear?: () => void;
};

export const StaffPickerFilters = ({
	keyword,
	roleFilter,
	serviceFilter,
	serviceTypeOptions,
	roleFilterOptions,
	onKeywordChange,
	onRoleFilterChange,
	onServiceFilterChange,
	onClear,
}: StaffPickerFiltersProps) => (
	<div className="mt-4 flex flex-col gap-3 sm:flex-row">
		<input
			type="search"
			placeholder="氏名・サービス区分で検索"
			className="input-bordered input w-full"
			value={keyword}
			onChange={(event) => onKeywordChange(event.target.value)}
		/>
		<FormSelect
			className="select-bordered select w-full sm:max-w-40"
			value={roleFilter}
			onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
			options={roleFilterOptions.map((option) => ({ value: option.value, label: option.label }))}
		/>
		<FormSelect
			className="select-bordered select w-full sm:max-w-48"
			value={serviceFilter}
			onChange={(event) => onServiceFilterChange(event.target.value)}
			options={[
				{ value: 'all', label: 'すべてのサービス区分' },
				...serviceTypeOptions.map((service) => ({ value: service, label: service })),
			]}
		/>
		{onClear && (
			<button type="button" className="btn btn-ghost" onClick={onClear}>
				選択をクリア
			</button>
		)}
	</div>
);
