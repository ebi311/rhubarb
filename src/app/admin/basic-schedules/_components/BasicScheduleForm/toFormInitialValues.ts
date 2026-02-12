import type { BasicScheduleRecord } from '@/models/basicScheduleActionSchemas';
import { timeObjectToString } from '@/utils/date';
import type { BasicScheduleFormInitialValues } from './BasicScheduleForm';

/** BasicScheduleRecord を BasicScheduleFormInitialValues に変換 */
export const toFormInitialValues = (
	schedule: BasicScheduleRecord,
): BasicScheduleFormInitialValues => ({
	clientId: schedule.client.id,
	serviceTypeId: schedule.service_type_id,
	weekday: schedule.weekday,
	startTime: timeObjectToString(schedule.start_time),
	endTime: timeObjectToString(schedule.end_time),
	note: schedule.note ?? '',
	staffId: schedule.staffs.length > 0 ? schedule.staffs[0].id : null,
});
