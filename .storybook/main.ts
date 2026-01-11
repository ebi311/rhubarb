import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		{
			name: '@storybook/addon-mcp',
			options: {
				toolsets: {
					dev: true, // Tools for story URL retrieval and UI building instructions (default: true)
					docs: true, // Tools for component manifest and documentation (default: true, requires experimental feature flag below 👇)
				},
				experimentalFormat: 'markdown', // Output format: 'markdown' (default) or 'xml'
			},
		},
	],
	features: {
		experimentalComponentsManifest: true,
		experimentalRSC: true,
	},
	framework: '@storybook/nextjs-vite',
	staticDirs: ['../public'],
};
export default config;
