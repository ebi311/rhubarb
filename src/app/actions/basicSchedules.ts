'use server';

import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import {
	BasicScheduleFilterSchema,
	BasicScheduleInputSchema,
} from '@/models/basicScheduleActionSchemas';
import { z } from 'zod';
import { ActionResult, errorResult } from './utils/actionResult';

export const createBasicScheduleAction = async (
	input: unknown,
): Promise<ActionResult<BasicScheduleRecord>> => {
	const parsed = BasicScheduleInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}
	return errorResult('Not implemented', 501);
};

export const updateBasicScheduleAction = async (
	id: string,
	input: unknown,
): Promise<ActionResult<BasicScheduleRecord>> => {
	const parsedId = z.string().uuid().safeParse(id);
	const parsedInput = BasicScheduleInputSchema.safeParse(input);
	if (!parsedId.success) return errorResult('Validation failed', 400, parsedId.error.flatten());
	if (!parsedInput.success)
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	return errorResult('Not implemented', 501);
};

export const deleteBasicScheduleAction = async (id: string): Promise<ActionResult<null>> => {
	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) return errorResult('Validation failed', 400, parsedId.error.flatten());
	return errorResult('Not implemented', 501);
};

export const listBasicSchedulesAction = async (
	filters: unknown = {},
): Promise<ActionResult<BasicScheduleRecord[]>> => {
	const parsed = BasicScheduleFilterSchema.safeParse(filters ?? {});
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}
	return errorResult('Not implemented', 501);
};
