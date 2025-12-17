import type { ServiceUser } from '@/models/serviceUser';
import { StatusBadge } from '../StatusBadge';

export interface ClientTableProps {
	clients: ServiceUser[];
	getHref: (client: ServiceUser) => string;
}

export const ClientTable = ({ clients, getHref }: ClientTableProps) => {
	if (clients.length === 0) {
		return (
			<div className="text-center py-8 text-base-content/70">利用者がまだ登録されていません</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			{/* ヘッダー */}
			<div
				className="grid grid-cols-[2fr_3fr_1fr] gap-4 px-4 py-3 bg-base-200 font-semibold text-sm"
				role="row"
			>
				<div role="columnheader">氏名</div>
				<div role="columnheader">住所</div>
				<div role="columnheader">ステータス</div>
			</div>

			{/* ボディ */}
			<div role="rowgroup">
				{clients.map((client, index) => (
					<a
						key={client.id}
						href={getHref(client)}
						className={`grid grid-cols-[2fr_3fr_1fr] gap-4 px-4 py-3 items-center hover:bg-base-200 focus:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
							index % 2 === 1 ? 'bg-base-100' : ''
						}`}
						role="row"
						aria-label={`${client.name}の情報を編集`}
					>
						<div role="cell" className="font-medium">
							{client.name}
						</div>
						<div role="cell" className="text-sm">
							{client.address}
						</div>
						<div role="cell">
							<StatusBadge status={client.contract_status} />
						</div>
					</a>
				))}
			</div>
		</div>
	);
};
