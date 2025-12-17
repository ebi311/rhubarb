'use server';

import {
	ServiceError,
	ServiceUserService,
	type ServiceUserStatusFilter,
} from '@/backend/services/serviceUserService';
import { type ServiceUser, type ServiceUserInput } from '@/models/serviceUser';
import { createSupabaseClient } from '@/utils/supabase/server';

export type ActionResult<T> = {
	data: T | null;
	error: string | null;
	status: number;
	details?: unknown;
};

const errorResult = <T>(error: string, status: number, details?: unknown): ActionResult<T> => ({
	data: null,
	error,
	status,
	details,
});

const successResult = <T>(data: T, status = 200): ActionResult<T> => ({
	data,
	error: null,
	status,
});

export const getServiceUsersAction = async (
	status: ServiceUserStatusFilter = 'active',
): Promise<ActionResult<ServiceUser[]>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);
	const service = new ServiceUserService(supabase);
	try {
		const serviceUsers = await service.getServiceUsers(user.id, status);
		return successResult(serviceUsers);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const createServiceUserAction = async (
	input: ServiceUserInput,
): Promise<ActionResult<ServiceUser>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);
	const service = new ServiceUserService(supabase);
	try {
		const serviceUser = await service.createServiceUser(user.id, input);
		return successResult(serviceUser, 201);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const updateServiceUserAction = async (
	id: string,
	input: ServiceUserInput,
): Promise<ActionResult<ServiceUser>> => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);
	const service = new ServiceUserService(supabase);
	try {
		const serviceUser = await service.updateServiceUser(user.id, id, input);
		return successResult(serviceUser);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const suspendServiceUserAction = async (id: string): Promise<ActionResult<ServiceUser>> => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);
	const service = new ServiceUserService(supabase);
	try {
		const serviceUser = await service.suspendServiceUser(user.id, id);
		return successResult(serviceUser);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const resumeServiceUserAction = async (id: string): Promise<ActionResult<ServiceUser>> => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);
	const service = new ServiceUserService(supabase);
	try {
		const serviceUser = await service.resumeServiceUser(user.id, id);
		return successResult(serviceUser);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};
