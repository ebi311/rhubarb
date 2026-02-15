import { deleteBasicScheduleAction } from '@/app/actions/basicSchedules';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type UseDeleteScheduleParams = {
	scheduleId?: string;
	/** 削除成功時のコールバック。指定時は router.push の代わりにこちらが呼ばれる */
	onDeleteSuccess?: () => void;
};

export const useDeleteSchedule = ({
	scheduleId,
	onDeleteSuccess,
}: UseDeleteScheduleParams) => {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);
	const { handleActionResult } = useActionResultHandler();

	const handleDelete = async () => {
		if (!scheduleId) return;

		const confirmed = window.confirm(
			'このスケジュールを削除してもよろしいですか？この操作は取り消せません。',
		);
		if (!confirmed) return;

		setIsDeleting(true);
		try {
			const result = await deleteBasicScheduleAction(scheduleId);
			handleActionResult(result, {
				successMessage: '基本スケジュールを削除しました',
				errorMessage: '基本スケジュールの削除に失敗しました',
				onSuccess: () => {
					if (onDeleteSuccess) {
						onDeleteSuccess();
					} else {
						router.push('/admin/basic-schedules');
					}
				},
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return {
		isDeleting,
		handleDelete,
	};
};
