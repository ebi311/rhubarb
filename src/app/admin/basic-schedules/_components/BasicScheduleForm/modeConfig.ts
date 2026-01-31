import type { BasicScheduleFormMode } from './BasicScheduleForm';

/** モード別のUI設定 */
export const MODE_CONFIG: Record<
	BasicScheduleFormMode,
	{
		headerTitle: string;
		headerDescription: string;
		submitButtonText: string;
		successMessage: string;
		errorMessage: string;
	}
> = {
	create: {
		headerTitle: '新規基本スケジュール',
		headerDescription:
			'必要な情報を入力し、「スケジュールを登録」を押してください。',
		submitButtonText: 'スケジュールを登録',
		successMessage: '基本スケジュールを登録しました',
		errorMessage: '基本スケジュールの登録に失敗しました',
	},
	edit: {
		headerTitle: '基本スケジュールの編集',
		headerDescription: '内容を変更し、「更新する」を押してください。',
		submitButtonText: '更新する',
		successMessage: '基本スケジュールを更新しました',
		errorMessage: '基本スケジュールの更新に失敗しました',
	},
};
