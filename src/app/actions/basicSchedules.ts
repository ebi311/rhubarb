'use server';

import {
	BasicScheduleService,
	ServiceError,
} from '@/backend/services/basicScheduleService';
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

	const parsed = BasicScheduleFilterSchema.safeParse({
		includeDeleted: false,
		...filters,
	});
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

export const getBasicScheduleByIdAction = async (
	id: string,
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

	const service = new BasicScheduleService(supabase);
	try {
		const schedule = await service.findById(parsedId.data);
		if (!schedule) {
			return errorResult('Basic schedule not found', 404);
		}
		return successResult(schedule);
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
		const schedule = await service.update(
			user.id,
			parsedId.data,
			parsedInput.data,
		);
		return successResult(schedule);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

export const deleteBasicScheduleAction = async (
	id: string,
): Promise<ActionResult<null>> => {
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

export type BatchSaveOperations = {
	create: BasicScheduleInput[];
	update: { id: string; input: BasicScheduleInput }[];
	delete: string[];
};

export type BatchSaveResult = {
	created: number;
	updated: number;
	deleted: number;
};

type BatchOperationError = { operation: string; index: number; error: string };

const executeDeleteOperations = async (
	service: BasicScheduleService,
	userId: string,
	ids: string[],
): Promise<{ count: number; errors: BatchOperationError[] }> => {
	let count = 0;
	const errors: BatchOperationError[] = [];

	for (let i = 0; i < ids.length; i++) {
		try {
			await service.delete(userId, ids[i]);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({ operation: 'delete', index: i, error: e.message });
			} else {
				throw e;
			}
		}
	}
	return { count, errors };
};

const executeUpdateOperations = async (
	service: BasicScheduleService,
	userId: string,
	updates: { id: string; input: BasicScheduleInput }[],
): Promise<{ count: number; errors: BatchOperationError[] }> => {
	let count = 0;
	const errors: BatchOperationError[] = [];

	for (let i = 0; i < updates.length; i++) {
		const { id, input } = updates[i];
		try {
			await service.update(userId, id, input);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({ operation: 'update', index: i, error: e.message });
			} else {
				throw e;
			}
		}
	}
	return { count, errors };
};

const executeCreateOperations = async (
	service: BasicScheduleService,
	userId: string,
	inputs: BasicScheduleInput[],
	clientId: string,
): Promise<{ count: number; errors: BatchOperationError[] }> => {
	let count = 0;
	const errors: BatchOperationError[] = [];

	for (let i = 0; i < inputs.length; i++) {
		const inputWithClientId = { ...inputs[i], client_id: clientId };
		try {
			await service.create(userId, inputWithClientId);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({ operation: 'create', index: i, error: e.message });
			} else {
				throw e;
			}
		}
	}
	return { count, errors };
};

export const batchSaveBasicSchedulesAction = async (
	clientId: string,
	operations: BatchSaveOperations,
): Promise<ActionResult<BatchSaveResult>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsedClientId = z.string().uuid().safeParse(clientId);
	if (!parsedClientId.success) {
		return errorResult(
			'Validation failed',
			400,
			parsedClientId.error.flatten(),
		);
	}

	const service = new BasicScheduleService(supabase);
	const allErrors: BatchOperationError[] = [];

	const deleteResult = await executeDeleteOperations(
		service,
		user.id,
		operations.delete,
	);
	allErrors.push(...deleteResult.errors);

	const updateResult = await executeUpdateOperations(
		service,
		user.id,
		operations.update,
	);
	allErrors.push(...updateResult.errors);

	const createResult = await executeCreateOperations(
		service,
		user.id,
		operations.create,
		parsedClientId.data,
	);
	allErrors.push(...createResult.errors);

	const result: BatchSaveResult = {
		created: createResult.count,
		updated: updateResult.count,
		deleted: deleteResult.count,
	};

	if (allErrors.length > 0) {
		return errorResult('Some operations failed', 207, {
			errors: allErrors,
			partialResult: result,
		});
	}

	return successResult(result);
};
