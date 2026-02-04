import { createSupabaseClient } from '@/utils/supabase/server';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Suspense } from 'react';
import { fn, mocked } from 'storybook/test';
import { Header } from './Header';

type MockSupabaseClient = Awaited<ReturnType<typeof createSupabaseClient>>;

const createMockSupabaseClient = (
	user: { email: string; user_metadata?: { name?: string } } | null,
): MockSupabaseClient =>
	({
		auth: {
			getUser: fn().mockResolvedValue({
				data: { user },
			}),
		},
	}) as unknown as MockSupabaseClient;

const meta: Meta<typeof Header> = {
	title: 'App/Header',
	component: Header,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<Suspense fallback={<div>Loading...</div>}>
				<Story />
			</Suspense>
		),
	],
	beforeEach: async () => {
		mocked(createSupabaseClient).mockResolvedValue(
			createMockSupabaseClient({
				email: 'demo@example.com',
				user_metadata: { name: 'デモユーザー' },
			}),
		);
	},
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {};

export const WithEmail: Story = {
	beforeEach: async () => {
		mocked(createSupabaseClient).mockResolvedValue(
			createMockSupabaseClient({
				email: 'user@example.com',
				user_metadata: {},
			}),
		);
	},
};

export const Guest: Story = {
	beforeEach: async () => {
		mocked(createSupabaseClient).mockResolvedValue(
			createMockSupabaseClient(null),
		);
	},
};
