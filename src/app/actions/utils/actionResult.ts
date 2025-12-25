export type ActionResult<T> = {
	data: T | null;
	error: string | null;
	status: number;
	details?: unknown;
};

export const logServerError = (error: unknown) => {
	if (process.env.NODE_ENV === 'test') return;
	if (error instanceof Error) {
		console.error('[ServerError]', error.stack ?? error.message);
		return;
	}
	console.error('[ServerError]', error);
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
