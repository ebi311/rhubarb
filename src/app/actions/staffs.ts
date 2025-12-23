'use server';

import { ServiceError } from '@/backend/services/basicScheduleService';
import { StaffService } from '@/backend/services/staffService';
import type { StaffInput, StaffRecord } from '@/models/staffActionSchemas';
import { StaffInputSchema } from '@/models/staffActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { ActionResult, errorResult, successResult } from './utils/actionResult';

const getAuthUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	return { supabase, user, error } as const;
};

const handleServiceError = <T>(error: unknown): ActionResult<T> => {
	if (error instanceof ServiceError) {
		return errorResult<T>(error.message, error.status, error.details);
	}
	throw error;
};

export const listStaffsAction = async (): Promise<ActionResult<StaffRecord[]>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const service = new StaffService(supabase);
	try {
		const staffs = await service.list(user.id);
		return successResult(staffs);
	} catch (err) {
		return handleServiceError<StaffRecord[]>(err);
	}
};

export const getStaffAction = async (id: string): Promise<ActionResult<StaffRecord>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		return errorResult('Validation failed', 400, parsedId.error.flatten());
	}

	const service = new StaffService(supabase);
	try {
		const staff = await service.get(user.id, parsedId.data);
		return successResult(staff);
	} catch (err) {
		return handleServiceError<StaffRecord>(err);
	}
};

export const createStaffAction = async (input: StaffInput): Promise<ActionResult<StaffRecord>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = StaffInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new StaffService(supabase);
	try {
		const staff = await service.create(user.id, parsedInput.data);
		return successResult(staff, 201);
	} catch (err) {
		return handleServiceError<StaffRecord>(err);
	}
};

export const updateStaffAction = async (
	id: string,
	input: StaffInput,
): Promise<ActionResult<StaffRecord>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		return errorResult('Validation failed', 400, parsedId.error.flatten());
	}

	const parsedInput = StaffInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new StaffService(supabase);
	try {
		const staff = await service.update(user.id, parsedId.data, parsedInput.data);
		return successResult(staff);
	} catch (err) {
		return handleServiceError<StaffRecord>(err);
	}
};

export const deleteStaffAction = async (id: string): Promise<ActionResult<null>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		return errorResult('Validation failed', 400, parsedId.error.flatten());
	}

	const service = new StaffService(supabase);
	try {
		await service.delete(user.id, parsedId.data);
		return successResult<null>(null, 204);
	} catch (err) {
		return handleServiceError<null>(err);
	}
};
