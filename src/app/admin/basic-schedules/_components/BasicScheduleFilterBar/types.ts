import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';

export interface BasicScheduleFilterState {
	weekday: DayOfWeek | undefined;
	clientId: string | undefined;
	serviceTypeId: string | undefined;
}

export interface ClientOption {
	id: string;
	name: string;
}

export interface ServiceTypeOption {
	id: string;
	name: string;
}
