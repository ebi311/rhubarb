'use client';

import type {
	ContractStatus,
	ServiceUser,
	ServiceUserInput,
} from '@/models/serviceUser';
import {
	useClientFilter,
	useClientModal,
	useClientMutations,
} from '../../_hooks';
import type { ModalState } from '../../_types';
import { ClientFilterTabs } from '../ClientFilterTabs';
import { ClientModal } from '../ClientModal';
import { ClientTable } from '../ClientTable';

interface ClientsPageContentProps {
	initialClients: ServiceUser[];
	initialFilter: 'all' | 'active' | 'suspended';
	modalState: ModalState;
}

export const ClientsPageContent = ({
	initialClients,
	initialFilter,
	modalState,
}: ClientsPageContentProps) => {
	const { filter, changeFilter } = useClientFilter(initialFilter);
	const { openCreate, getEditHref, close } = useClientModal(filter);

	// フィルター適用
	const filteredClients =
		filter === 'all'
			? initialClients
			: initialClients.filter((client) => client.contract_status === filter);

	// 編集対象の利用者を取得
	const editingClient = modalState?.clientId
		? initialClients.find((c) => c.id === modalState.clientId)
		: undefined;

	const { createClient, updateClient, updateContractStatus } =
		useClientMutations(close);

	// 新規作成ハンドラー
	const handleCreate = async (data: ServiceUserInput) => {
		await createClient(data);
	};

	// 編集ハンドラー
	const handleEdit = async (
		data: ServiceUserInput,
		contractStatus?: ContractStatus,
	) => {
		if (!editingClient) return;

		const updated = await updateClient(editingClient.id, data);
		if (!updated) return;

		if (contractStatus) {
			await updateContractStatus(
				editingClient.id,
				editingClient.contract_status,
				contractStatus,
			);
		}
	};

	return (
		<>
			{/* 新規登録ボタン */}
			<div className="mb-4">
				<button onClick={openCreate} className="btn btn-primary">
					＋ 新規登録
				</button>
			</div>

			{/* フィルタータブ */}
			<ClientFilterTabs activeFilter={filter} onFilterChange={changeFilter} />

			{/* テーブル */}
			<div className="mt-4">
				<ClientTable clients={filteredClients} getHref={getEditHref} />
			</div>

			{/* モーダル */}
			{modalState?.mode === 'create' && (
				<ClientModal
					isOpen={true}
					mode="create"
					onClose={close}
					onSubmit={handleCreate}
				/>
			)}
			{modalState?.mode === 'edit' && editingClient && (
				<ClientModal
					isOpen={true}
					mode="edit"
					client={editingClient}
					onClose={close}
					onSubmit={handleEdit}
				/>
			)}
		</>
	);
};
