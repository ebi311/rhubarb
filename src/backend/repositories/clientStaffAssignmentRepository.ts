import { Database } from '@/backend/types/supabase';
import { ClientStaffAssignmentSchema } from '@/models/clientStaffAssignment';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

const ClientStaffAssignmentLinkSchema = ClientStaffAssignmentSchema.pick({
	client_id: true,
	staff_id: true,
	service_type_id: true,
});

export type ClientStaffAssignmentLink = z.infer<
	typeof ClientStaffAssignmentLinkSchema
>;

export class ClientStaffAssignmentRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	async canAssignStaffToClient(params: {
		officeId: string;
		clientId: string;
		staffId: string;
		serviceTypeId: ServiceTypeId;
	}): Promise<boolean> {
		const { data, error } = await this.supabase
			.from('client_staff_assignments')
			.select('id, clients!inner(office_id), staffs!inner(office_id)')
			.eq('clients.office_id', params.officeId)
			.eq('staffs.office_id', params.officeId)
			.eq('client_id', params.clientId)
			.eq('staff_id', params.staffId)
			.eq('service_type_id', params.serviceTypeId)
			.maybeSingle();

		if (error) throw error;
		return data != null;
	}

	async listLinksByOfficeAndClientIds(
		officeId: string,
		clientIds: string[],
	): Promise<ClientStaffAssignmentLink[]> {
		if (clientIds.length === 0) return [];

		const { data, error } = await this.supabase
			.from('client_staff_assignments')
			.select(
				'client_id, staff_id, service_type_id, clients!inner(office_id), staffs!inner(office_id)',
			)
			.eq('clients.office_id', officeId)
			.eq('staffs.office_id', officeId)
			.in('client_id', clientIds);

		if (error) throw error;

		return ClientStaffAssignmentLinkSchema.array().parse(
			(data ?? []).map((row) => ({
				client_id: row.client_id,
				staff_id: row.staff_id,
				service_type_id: row.service_type_id,
			})),
		);
	}
}
