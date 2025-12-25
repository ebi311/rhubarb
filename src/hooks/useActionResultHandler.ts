import type { ActionResult } from '@/app/actions/utils/actionResult';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

type HandleActionResultOptions<T> = {
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: (data: T | null) => void;
	onError?: (error: string | null, result: ActionResult<T>) => void;
};

const DEFAULT_SUCCESS = '操作が完了しました';
const DEFAULT_ERROR = 'エラーが発生しました';

const notifyError = <T>(result: ActionResult<T>, options?: HandleActionResultOptions<T>) => {
	toast.error(options?.errorMessage ?? result.error ?? DEFAULT_ERROR);
	options?.onError?.(result.error, result);
	return false;
};

const notifySuccess = <T>(result: ActionResult<T>, options?: HandleActionResultOptions<T>) => {
	toast.success(options?.successMessage ?? DEFAULT_SUCCESS);
	options?.onSuccess?.(result.data ?? null);
	return true;
};

export const useActionResultHandler = () => {
	const handleActionResult = useCallback(
		<T>(result: ActionResult<T>, options?: HandleActionResultOptions<T>) =>
			result.error ? notifyError(result, options) : notifySuccess(result, options),
		[],
	);

	return { handleActionResult };
};

export type { HandleActionResultOptions };
