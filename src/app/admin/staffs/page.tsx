import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import { StaffListPage } from './_components/StaffListPage';
import { convertStaffFilterRole, StaffFilterState } from './_types';

const StaffsPage = async ({
	searchParams,
}: {
	searchParams: Promise<{ query?: string; role?: string }>;
}) => {
	const [staffsResult, serviceTypesResult] = await Promise.all([
		listStaffsAction(),
		listServiceTypesAction(),
	]);

	if (staffsResult.error) {
		console.error('Failed to fetch staffs', staffsResult.error, staffsResult.status);
	}

	if (serviceTypesResult.error) {
		console.error(
			'Failed to fetch service types',
			serviceTypesResult.error,
			serviceTypesResult.status,
		);
	}

	const searchParamsResolved = await searchParams;
	const filters: StaffFilterState = {
		query: searchParamsResolved.query ?? '',
		role: convertStaffFilterRole(searchParamsResolved.role),
	};

	return (
		<div className="container mx-auto max-w-6xl p-4">
			<StaffListPage
				initialStaffs={staffsResult.data ?? []}
				serviceTypes={serviceTypesResult.data ?? []}
				filters={filters}
			/>
		</div>
	);
};

export default StaffsPage;
