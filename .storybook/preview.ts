import type { Preview } from '@storybook/nextjs-vite';
import { sb } from 'storybook/test';
import '../src/app/globals.css';

// モジュールのモック登録（Automocking）
sb.mock(
	import('../src/app/admin/basic-schedules/_components/BasicScheduleTable/fetchBasicSchedules.ts'),
);
sb.mock(import('../src/app/actions/weeklySchedules.ts'));
sb.mock(import('../src/utils/supabase/server.ts'));
sb.mock(import('../src/app/actions/auth.ts'));
sb.mock(import('../src/app/actions/basicSchedules.ts'));

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		nextjs: {
			appDirectory: true,
		},

		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: 'todo',
		},
	},
};

export default preview;
