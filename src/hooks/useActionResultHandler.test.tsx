import type { ActionResult } from '@/app/actions/utils/actionResult';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActionResultHandler } from './useActionResultHandler';

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('react-toastify', () => ({
	toast: {
		success: (...args: unknown[]) => toastSuccess(...args),
		error: (...args: unknown[]) => toastError(...args),
	},
}));

type TestHarnessProps<T> = {
	onReady: (
		handle: (result: ActionResult<T>, options?: unknown) => boolean,
	) => void;
};

const TestHarness = <T,>({ onReady }: TestHarnessProps<T>) => {
	const { handleActionResult } = useActionResultHandler();
	useEffect(() => {
		onReady(handleActionResult as any);
	}, [handleActionResult, onReady]);
	return null;
};

describe('useActionResultHandler', () => {
	const mountHandler = async <T,>() => {
		const ready = vi.fn();
		render(<TestHarness onReady={ready} />);
		await waitFor(() => {
			expect(ready).toHaveBeenCalled();
		});
		return ready.mock.calls.at(-1)![0] as (
			result: ActionResult<T>,
			options?: unknown,
		) => boolean;
	};

	beforeEach(() => {
		toastSuccess.mockClear();
		toastError.mockClear();
	});

	it('成功結果で成功トーストを表示し、onSuccessを呼び出す', async () => {
		const handle = await mountHandler<string>();
		const onSuccess = vi.fn();
		const result: ActionResult<string> = {
			data: 'ok',
			error: null,
			status: 200,
		};

		const handled = handle(result, {
			successMessage: '保存しました',
			onSuccess,
		});

		expect(handled).toBe(true);
		expect(toastSuccess).toHaveBeenCalledWith('保存しました');
		expect(onSuccess).toHaveBeenCalledWith('ok');
	});

	it('エラー結果でエラートーストを表示し、onErrorを呼び出す', async () => {
		const handle = await mountHandler<string>();
		const onError = vi.fn();
		const result: ActionResult<string> = {
			data: null,
			error: '失敗しました',
			status: 400,
		};

		const handled = handle(result, {
			errorMessage: '削除に失敗しました',
			onError,
		});

		expect(handled).toBe(false);
		expect(toastError).toHaveBeenCalledWith('削除に失敗しました');
		expect(onError).toHaveBeenCalledWith('失敗しました', result);
	});
});
