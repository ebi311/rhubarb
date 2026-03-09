import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/nextjs-vite';
import { vi } from 'vitest';
import * as projectAnnotations from './preview';

// @ai-sdk/react のモック（Storybook環境でのESM互換性問題を回避）
vi.mock('@ai-sdk/react', () => ({
	useChat: () => ({
		messages: [],
		isLoading: false,
		error: null,
		append: vi.fn(),
		setMessages: vi.fn(),
		stop: vi.fn(),
	}),
}));

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);
