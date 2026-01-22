'use server';

import { ClientStaffAssignmentSchema } from '@/models/clientStaffAssignment';
import { createSupabaseClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { ActionResult, errorResult, successResult } from './utils/actionResult';

const ClientStaffAssignmentLinkSchema = ClientStaffAssignmentSchema.pick({
	client_id: true,
	service_type_id: true,
	staff_id: true,
});

export type ClientStaffAssignmentLink = z.infer<
	typeof ClientStaffAssignmentLinkSchema
>;

type StaffContext = {
	office_id: string;
	role: 'admin' | 'helper';
};

export const listClientStaffAssignmentsAction = async (): Promise<
	ActionResult<ClientStaffAssignmentLink[]>
> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return errorResult('Unauthorized', 401);
	}

	const { data: staffContext, error: staffError } = await supabase
		.from('staffs')
		.select('office_id, role')
		.eq('auth_user_id', user.id)
		.maybeSingle<StaffContext>();

	if (staffError) {
		return errorResult('Failed to resolve staff context', 500, staffError);
	}

	if (!staffContext) {
		return errorResult('Staff not found', 404);
	}

	if (staffContext.role !== 'admin') {
		return errorResult('Forbidden', 403);
	}

	const { data, error: assignmentError } = await supabase
		.from('client_staff_assignments')
		.select('client_id, service_type_id, staff_id, clients!inner(office_id)')
		.eq('clients.office_id', staffContext.office_id);

	if (assignmentError) {
		return errorResult(
			'Failed to fetch client staff assignments',
			500,
			assignmentError,
		);
	}

	const parsed = ClientStaffAssignmentLinkSchema.array().safeParse(
		(data ?? []).map((row) => ({
			client_id: row.client_id,
			service_type_id: row.service_type_id,
			staff_id: row.staff_id,
		})),
	);

	if (!parsed.success) {
		return errorResult(
			'Invalid client staff assignment data',
			500,
			z.treeifyError(parsed.error),
		);
	}

	return successResult(parsed.data);
};
