import { useWatch, type Control } from 'react-hook-form';
import type { BasicScheduleFormValues } from './BasicScheduleForm';

type WatchedFormValues = {
	clientId: BasicScheduleFormValues['clientId'];
	serviceTypeId: BasicScheduleFormValues['serviceTypeId'];
	selectedStaffId: Exclude<BasicScheduleFormValues['staffId'], undefined>;
	noteValue: Exclude<BasicScheduleFormValues['note'], undefined>;
};

export const useBasicScheduleWatchValues = (
	control: Control<BasicScheduleFormValues>,
	defaults: Pick<
		BasicScheduleFormValues,
		'clientId' | 'serviceTypeId' | 'staffId' | 'note'
	>,
): WatchedFormValues => {
	const values = useWatch({ control }) as
		| Partial<BasicScheduleFormValues>
		| undefined;
	return {
		clientId: values?.clientId ?? defaults.clientId,
		serviceTypeId: values?.serviceTypeId ?? defaults.serviceTypeId,
		selectedStaffId: (values?.staffId ??
			defaults.staffId) as WatchedFormValues['selectedStaffId'],
		noteValue: (values?.note ??
			defaults.note) as WatchedFormValues['noteValue'],
	};
};
