'use client';

import { ToastContainer } from 'react-toastify';

export const ToastProvider = () => (
	<ToastContainer
		position="top-right"
		autoClose={2000}
		newestOnTop
		closeOnClick
		pauseOnFocusLoss
		pauseOnHover
		limit={3}
		role="status"
		data-testid="toast-container"
	/>
);
