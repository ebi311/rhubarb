import { Icon } from '@/app/_components/Icon';
import type { AlertItem } from '@/models/dashboardActionSchemas';
import { timeObjectToString } from '@/utils/date';

type Props = {
	alerts: AlertItem[];
};

export const DashboardAlerts = ({ alerts }: Props) => {
	if (alerts.length === 0) {
		return null;
	}

	return (
		<section className="space-y-2">
			<h2 className="text-lg font-bold">注意が必要な予定</h2>
			{alerts.map((alert) => (
				<div
					key={alert.id}
					role="alert"
					className={`alert ${alert.type === 'unassigned' ? 'alert-warning' : 'alert-error'}`}
				>
					<Icon name="warning" className="h-6 w-6 shrink-0" />
					<div>
						<div className="font-bold">
							{alert.clientName} - {timeObjectToString(alert.startTime)}
						</div>
						<div className="text-sm">{alert.message}</div>
					</div>
				</div>
			))}
		</section>
	);
};
