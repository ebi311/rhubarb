'use client';

import { Icon } from '@/app/_components/Icon';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BasicScheduleForm } from '../BasicScheduleForm';
import { createFixedClientServiceUser } from './createFixedClientServiceUser';

export type AddButtonProps = {
	weekday: DayOfWeek;
	serviceTypes: ServiceTypeOption[];
	staffs: StaffRecord[];
	clientId: string;
	clientName: string;
};

export const AddButton = ({
	weekday,
	serviceTypes,
	staffs,
	clientId,
	clientName,
}: AddButtonProps) => {
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleOpenModal = () => {
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
	};

	const handleAddSuccess = () => {
		setIsModalOpen(false);
		router.refresh();
	};

	// fixedClientId 用に serviceUsers を作成
	const serviceUsers = [createFixedClientServiceUser(clientId, clientName)];

	return (
		<>
			<button
				className="btn invisible btn-circle btn-sm btn-secondary group-hover:visible"
				aria-label="シフト追加"
				onClick={handleOpenModal}
			>
				<Icon name="add" />
			</button>
			{isModalOpen && (
				<dialog
					className="modal-open modal"
					open
					aria-modal="true"
					onClose={handleCloseModal}
				>
					<div className="modal-box">
						<h3 className="mb-4 text-lg font-bold">予定を追加</h3>
						<BasicScheduleForm
							serviceUsers={serviceUsers}
							serviceTypes={serviceTypes}
							staffs={staffs}
							mode="create"
							fixedClientId={clientId}
							fixedWeekday={weekday}
							asModal
							onSubmitSuccess={handleAddSuccess}
							onCancel={handleCloseModal}
						/>
					</div>
					<form method="dialog" className="modal-backdrop">
						<button aria-label="モーダルを閉じる" onClick={handleCloseModal}>
							close
						</button>
					</form>
				</dialog>
			)}
		</>
	);
};
