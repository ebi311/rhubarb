'use server';

import {
	BasicScheduleService,
	ServiceError,
} from '@/backend/services/basicScheduleService';
import type {
	BasicScheduleFilters,
	BasicScheduleInput,
	BasicScheduleRecord,
	BatchSaveOperations,
} from '@/models/basicScheduleActionSchemas';
import {
	BasicScheduleFilterSchema,
	BasicScheduleInputSchema,
	BatchSaveOperationsSchema,
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

export type BatchSaveResult = {
	created: number;
	updated: number;
	deleted: number;
};

export type BatchOperationError = {
	operation: 'create' | 'update' | 'delete';
	index: number;
	id?: string;
	error: string;
	details?: unknown;
};

const processCreateOperations = async (
	service: BasicScheduleService,
	userId: string,
	creates: BatchSaveOperations['create'],
	errors: BatchOperationError[],
): Promise<number> => {
	let count = 0;
	for (let i = 0; i < creates.length; i++) {
		try {
			await service.create(userId, creates[i]);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({
					operation: 'create',
					index: i,
					error: e.message,
					details: e.details,
				});
			} else {
				throw e;
			}
		}
	}
	return count;
};

const processUpdateOperations = async (
	service: BasicScheduleService,
	userId: string,
	updates: BatchSaveOperations['update'],
	errors: BatchOperationError[],
): Promise<number> => {
	let count = 0;
	for (let i = 0; i < updates.length; i++) {
		const { id, input } = updates[i];
		try {
			await service.update(userId, id, input);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({
					operation: 'update',
					index: i,
					id,
					error: e.message,
					details: e.details,
				});
			} else {
				throw e;
			}
		}
	}
	return count;
};

const processDeleteOperations = async (
	service: BasicScheduleService,
	userId: string,
	deletes: BatchSaveOperations['delete'],
	errors: BatchOperationError[],
): Promise<number> => {
	let count = 0;
	for (let i = 0; i < deletes.length; i++) {
		const id = deletes[i];
		try {
			await service.delete(userId, id);
			count++;
		} catch (e) {
			if (e instanceof ServiceError) {
				errors.push({
					operation: 'delete',
					index: i,
					id,
					error: e.message,
					details: e.details,
				});
			} else {
				throw e;
			}
		}
	}
	return count;
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
		return errorResult('Invalid clientId', 400, parsedClientId.error.flatten());
	}

	const parsedOperations = BatchSaveOperationsSchema.safeParse(operations);
	if (!parsedOperations.success) {
		return errorResult(
			'Invalid operations',
			400,
			parsedOperations.error.flatten(),
		);
	}

	const service = new BasicScheduleService(supabase);
	const allErrors: BatchOperationError[] = [];
	const { create, update, delete: deleteOps } = parsedOperations.data;

	const createdCount = await processCreateOperations(
		service,
		user.id,
		create,
		allErrors,
	);
	const updatedCount = await processUpdateOperations(
		service,
		user.id,
		update,
		allErrors,
	);
	const deletedCount = await processDeleteOperations(
		service,
		user.id,
		deleteOps,
		allErrors,
	);

	if (allErrors.length > 0) {
		return errorResult('Partial failure', 207, {
			result: {
				created: createdCount,
				updated: updatedCount,
				deleted: deletedCount,
			},
			errors: allErrors,
		});
	}

	return successResult({
		created: createdCount,
		updated: updatedCount,
		deleted: deletedCount,
	});
};
