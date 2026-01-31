import { deleteBasicScheduleAction } from '@/app/actions/basicSchedules';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type UseDeleteScheduleParams = {
	scheduleId?: string;
};

export const useDeleteSchedule = ({ scheduleId }: UseDeleteScheduleParams) => {
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
					router.push('/admin/basic-schedules');
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
