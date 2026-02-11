import { Icon } from '@/app/_components/Icon';
import { createBasicScheduleAction } from '@/app/actions/basicSchedules';
import { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import React, { ComponentProps } from 'react';
import {
	ScheduleEditFormModal,
	ScheduleEditFormModalProps,
} from '../../clients/[clientId]/edit/_components/ScheduleEditFormModal';

export const AddButton: React.FC<{
	weekday: DayOfWeek;
	serviceTypeOptions: ScheduleEditFormModalProps['serviceTypeOptions'];
	staffOptions: ScheduleEditFormModalProps['staffOptions'];
	clientId: string;
}> = ({ weekday, serviceTypeOptions, staffOptions, clientId }) => {
	const [isModalOpen, setIsModalOpen] = React.useState(false);
	const handleOpenModal = () => {
		setIsModalOpen(true);
	};
	const handleSubmit: ComponentProps<
		typeof ScheduleEditFormModal
	>['onSubmit'] = async (data) => {
		await createBasicScheduleAction({
			client_id: clientId,
			end_time: data.endTime,
			start_time: data.startTime,
			weekday,
			note: data.note,
			service_type_id: data.serviceTypeId,
			staff_ids: data.staffIds,
		});
		setIsModalOpen(false);
	};
	return (
		<>
			<button
				className="btn invisible btn-circle btn-sm btn-secondary group-hover:visible"
				aria-label="シフト追加"
				onClick={handleOpenModal}
			>
				<Icon name="add" />
			</button>{' '}
			<ScheduleEditFormModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				weekday={weekday}
				staffOptions={staffOptions}
				serviceTypeOptions={serviceTypeOptions}
				onSubmit={handleSubmit}
			/>
		</>
	);
};
