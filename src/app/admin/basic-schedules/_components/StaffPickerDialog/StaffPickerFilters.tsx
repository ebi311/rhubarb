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
			className="input input-bordered w-full"
			value={keyword}
			onChange={(event) => onKeywordChange(event.target.value)}
		/>
		<select
			className="select select-bordered w-full sm:max-w-40"
			value={roleFilter}
			onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
		>
			{roleFilterOptions.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
		<select
			className="select select-bordered w-full sm:max-w-48"
			value={serviceFilter}
			onChange={(event) => onServiceFilterChange(event.target.value)}
		>
			<option value="all">すべてのサービス区分</option>
			{serviceTypeOptions.map((service) => (
				<option key={service} value={service}>
					{service}
				</option>
			))}
		</select>
		{onClear && (
			<button type="button" className="btn btn-ghost" onClick={onClear}>
				選択をクリア
			</button>
		)}
	</div>
);
