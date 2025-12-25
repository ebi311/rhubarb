import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from './ToastProvider';

describe('ToastProvider', () => {
	it('ToastContainer を描画する', () => {
		render(<ToastProvider />);

		expect(document.querySelector('.Toastify')).not.toBeNull();
	});
});
