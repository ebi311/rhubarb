import { Icon } from '@/app/_components/Icon';
import type { AlertItem } from '@/models/dashboardActionSchemas';
import { dateJst, timeObjectToString } from '@/utils/date';
import Link from 'next/link';

type Props = {
	alerts: AlertItem[];
};

const getWeeklyScheduleUrl = (date: Date) => {
	const monday = dateJst(date).startOf('isoWeek').format('YYYY-MM-DD');
	return `/admin/weekly-schedules?week=${monday}`;
};

const formatDateMD = (date: Date) => dateJst(date).format('M/D');

export const DashboardAlerts = ({ alerts }: Props) => {
	if (alerts.length === 0) {
		return null;
	}

	return (
		<section className="space-y-2">
			<h2 className="text-lg font-bold">注意が必要な予定</h2>
			{alerts.map((alert) => {
				const dateMD = formatDateMD(alert.date);
				const timeStr = timeObjectToString(alert.startTime);
				const ariaLabel = `${dateMD} ${alert.clientName} ${timeStr} の週次スケジュールを表示`;

				return (
					<Link
						key={alert.id}
						href={getWeeklyScheduleUrl(alert.date)}
						aria-label={ariaLabel}
						className={`alert ${alert.type === 'unassigned' ? 'alert-warning' : 'alert-error'}`}
					>
						<Icon name="warning" className="h-6 w-6 shrink-0" />
						<div>
							<div className="font-bold">
								<span>{dateMD}</span>
								<span className="mx-1">{alert.clientName}</span>
								<span>{timeStr}</span>
							</div>
							<div className="text-sm">{alert.message}</div>
						</div>
					</Link>
				);
			})}
		</section>
	);
};
