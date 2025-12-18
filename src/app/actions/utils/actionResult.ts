export type ActionResult<T> = {
	data: T | null;
	error: string | null;
	status: number;
	details?: unknown;
};

export const errorResult = <T>(
	error: string,
	status: number,
	details?: unknown,
): ActionResult<T> => ({
	data: null,
	error,
	status,
	details,
});

export const successResult = <T>(data: T, status = 200): ActionResult<T> => ({
	data,
	error: null,
	status,
});
