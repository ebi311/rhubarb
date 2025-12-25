import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { ToastProvider } from './ToastProvider';

const meta = {
	title: 'Common/ToastProvider',
	component: ToastProvider,
	parameters: {
		layout: 'fullscreen',
	},
} satisfies Meta<typeof ToastProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

const Demo = () => {
	const [count, setCount] = useState(0);
	return (
		<div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4">
			<ToastProvider />
			<button
				type="button"
				className="btn btn-primary"
				onClick={() => {
					const next = count + 1;
					setCount(next);
					toast.success(`Success toast #${next}`, { autoClose: 2000 });
				}}
			>
				Show success toast
			</button>
			<button
				type="button"
				className="btn btn-error"
				onClick={() => toast.error('Something went wrong')}
			>
				Show error toast
			</button>
		</div>
	);
};

export const Default: Story = {
	render: () => <Demo />,
};
