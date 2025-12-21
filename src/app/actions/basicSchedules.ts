'use server';

import { BasicScheduleService, ServiceError } from '@/backend/services/basicScheduleService';
import type {
	BasicScheduleFilters,
	BasicScheduleInput,
	BasicScheduleRecord,
} from '@/models/basicScheduleActionSchemas';
import {
	BasicScheduleFilterSchema,
	BasicScheduleInputSchema,
} from '@/models/basicScheduleActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { ActionResult, errorResult, successResult } from './utils/actionResult';

export const listBasicSchedulesAction = async (
	filters: Partial<BasicScheduleFilters> = {},
): Promise<ActionResult<BasicScheduleRecord[]>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsed = BasicScheduleFilterSchema.safeParse({ includeDeleted: false, ...filters });
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const service = new BasicScheduleService(supabase);
	try {
		const schedules = await service.list(user.id, parsed.data);
		return successResult(schedules);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const createBasicScheduleAction = async (
	input: BasicScheduleInput,
): Promise<ActionResult<BasicScheduleRecord>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsed = BasicScheduleInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const service = new BasicScheduleService(supabase);
	try {
		const schedule = await service.create(user.id, parsed.data);
		return successResult(schedule, 201);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const updateBasicScheduleAction = async (
	id: string,
	input: BasicScheduleInput,
): Promise<ActionResult<BasicScheduleRecord>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		return errorResult('Validation failed', 400, parsedId.error.flatten());
	}

	const parsedInput = BasicScheduleInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new BasicScheduleService(supabase);
	try {
		const schedule = await service.update(user.id, parsedId.data, parsedInput.data);
		return successResult(schedule);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const deleteBasicScheduleAction = async (id: string): Promise<ActionResult<null>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		return errorResult('Validation failed', 400, parsedId.error.flatten());
	}

	const service = new BasicScheduleService(supabase);
	try {
		await service.delete(user.id, parsedId.data);
		return successResult(null);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};
