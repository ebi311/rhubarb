import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';

type StaffAbsenceFormProps = {
	helperStaffOptions: StaffPickerOption[];
	staffId: string;
	startDateStr: string;
	endDateStr: string;
	startDateMin: string;
	startDateMax: string;
	endDateMin: string;
	endDateMax: string;
	isSubmitting: boolean;
	onStaffIdChange: (value: string) => void;
	onStartDateChange: (value: string) => void;
	onEndDateChange: (value: string) => void;
};

export const StaffAbsenceForm = ({
	helperStaffOptions,
	staffId,
	startDateStr,
	endDateStr,
	startDateMin,
	startDateMax,
	endDateMin,
	endDateMax,
	isSubmitting,
	onStaffIdChange,
	onStartDateChange,
	onEndDateChange,
}: StaffAbsenceFormProps) => {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div className="sm:col-span-1">
				<label className="label" htmlFor="shift-adjust-staff">
					<span className="label-text font-medium">欠勤スタッフ</span>
				</label>
				<select
					id="shift-adjust-staff"
					className="select-bordered select w-full"
					value={staffId}
					onChange={(e) => onStaffIdChange(e.target.value)}
					disabled={isSubmitting}
				>
					<option value="" disabled>
						スタッフを選択
					</option>
					{helperStaffOptions.map((staff) => (
						<option key={staff.id} value={staff.id}>
							{staff.name}
						</option>
					))}
				</select>
			</div>
			<div>
				<label className="label" htmlFor="shift-adjust-start">
					<span className="label-text font-medium">開始日</span>
				</label>
				<input
					id="shift-adjust-start"
					type="date"
					className="input-bordered input w-full"
					value={startDateStr}
					min={startDateMin}
					max={startDateMax}
					onChange={(e) => onStartDateChange(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>
			<div>
				<label className="label" htmlFor="shift-adjust-end">
					<span className="label-text font-medium">終了日</span>
				</label>
				<input
					id="shift-adjust-end"
					type="date"
					className="input-bordered input w-full"
					value={endDateStr}
					min={endDateMin}
					max={endDateMax}
					onChange={(e) => onEndDateChange(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>
		</div>
	);
};
