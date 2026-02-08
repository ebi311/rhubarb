import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBeforeUnload } from './useBeforeUnload';

describe('useBeforeUnload', () => {
	const originalAddEventListener = window.addEventListener;
	const originalRemoveEventListener = window.removeEventListener;
	let addEventListenerMock: ReturnType<typeof vi.fn>;
	let removeEventListenerMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		addEventListenerMock = vi.fn();
		removeEventListenerMock = vi.fn();

		window.addEventListener = addEventListenerMock as any;

		window.removeEventListener = removeEventListenerMock as any;
	});

	afterEach(() => {
		window.addEventListener = originalAddEventListener;
		window.removeEventListener = originalRemoveEventListener;
	});

	it('isEnabled が true の場合、beforeunload イベントリスナーを登録する', () => {
		renderHook(() => useBeforeUnload(true));

		expect(addEventListenerMock).toHaveBeenCalledWith(
			'beforeunload',
			expect.any(Function),
		);
	});

	it('isEnabled が false の場合、beforeunload イベントリスナーを登録しない', () => {
		renderHook(() => useBeforeUnload(false));

		const beforeunloadCalls = addEventListenerMock.mock.calls.filter(
			(call) => call[0] === 'beforeunload',
		);
		expect(beforeunloadCalls).toHaveLength(0);
	});

	it('アンマウント時にイベントリスナーを解除する', () => {
		const { unmount } = renderHook(() => useBeforeUnload(true));

		unmount();

		expect(removeEventListenerMock).toHaveBeenCalledWith(
			'beforeunload',
			expect.any(Function),
		);
	});

	it('isEnabled が true から false に変わった場合、リスナーを解除する', () => {
		const { rerender } = renderHook(({ enabled }) => useBeforeUnload(enabled), {
			initialProps: { enabled: true },
		});

		rerender({ enabled: false });

		expect(removeEventListenerMock).toHaveBeenCalledWith(
			'beforeunload',
			expect.any(Function),
		);
	});

	it('beforeunload イベントが発火した場合、event.preventDefault を呼び出す', () => {
		renderHook(() => useBeforeUnload(true));

		// addEventListener に渡されたハンドラを取得
		const handler = addEventListenerMock.mock.calls.find(
			(call) => call[0] === 'beforeunload',
		)?.[1];

		expect(handler).toBeDefined();

		// イベントをシミュレート
		const mockEvent = {
			preventDefault: vi.fn(),
			returnValue: '',
		};

		handler(mockEvent);

		expect(mockEvent.preventDefault).toHaveBeenCalled();
	});
});
