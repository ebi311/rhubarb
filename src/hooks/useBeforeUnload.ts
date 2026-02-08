import { useEffect } from 'react';

/**
 * ページ離脱時に警告を表示するフック
 * @param isEnabled 警告を有効にするかどうか
 */
export const useBeforeUnload = (isEnabled: boolean): void => {
	useEffect(() => {
		if (!isEnabled) {
			return;
		}

		const handler = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Chrome では returnValue の設定が必要
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handler);

		return () => {
			window.removeEventListener('beforeunload', handler);
		};
	}, [isEnabled]);
};
