import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ServiceTypeOption, StaffFilterState, StaffViewModel } from '../../_types';
import { StaffFilterBar } from '../StaffFilterBar';
import { StaffTable } from '../StaffTable';

interface StaffListPageClientProps {
	initialStaffs: StaffRecord[];
	serviceTypes: ServiceTypeOption[];
	filters: StaffFilterState;
}

const formatDateTime = (date: Date) =>
	new Intl.DateTimeFormat('ja-JP', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);

const buildServiceTypeMap = (serviceTypes: ServiceTypeOption[]) => {
	const map = new Map<string, string>();
	serviceTypes.forEach((type) => {
		map.set(type.id, type.name);
	});
	return map;
};

const toViewModel = (staff: StaffRecord, serviceTypeMap: Map<string, string>): StaffViewModel => ({
	id: staff.id,
	name: staff.name,
	role: staff.role,
	email: staff.email ?? null,
	note: staff.note ?? null,
	serviceTypes: staff.service_type_ids.map((serviceTypeId) => ({
		id: serviceTypeId,
		name: serviceTypeMap.get(serviceTypeId) ?? serviceTypeId,
	})),
	updatedAt: formatDateTime(staff.updated_at),
});

export const StaffListPage = ({
	initialStaffs,
	serviceTypes,
	filters,
}: StaffListPageClientProps) => {
	const serviceTypeMap = buildServiceTypeMap(serviceTypes);
	const staffViewModels = initialStaffs.map((staff) => toViewModel(staff, serviceTypeMap));

	// const [filters, setFilters] = useState<StaffFilterState>({ query: '', role: 'all' });

	const filteredStaffs = (() => {
		const keyword = filters.query.trim().toLowerCase();
		return staffViewModels.filter((staff) => {
			const matchesKeyword =
				keyword.length === 0 ||
				staff.name.toLowerCase().includes(keyword) ||
				(staff.email ?? '').toLowerCase().includes(keyword);
			const matchesRole = filters.role === 'all' || staff.role === filters.role;
			return matchesKeyword && matchesRole;
		});
	})();

	return (
		<section className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold">担当者管理</h1>
					<p className="text-base-content/70 text-sm">
						サービス区分権限と備考情報を含む担当者の一覧です。
					</p>
				</div>
				<button type="button" className="btn btn-primary" disabled>
					＋ 担当者を追加
				</button>
			</div>
			<StaffFilterBar filters={filters} />
			<StaffTable staffs={filteredStaffs} />
		</section>
	);
};
