"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceUser, ContractStatus, ServiceUserInput } from "@/models/serviceUser";
import { ClientFilterTabs } from "../ClientFilterTabs";
import { ClientTable } from "../ClientTable";
import { ClientModal } from "../ClientModal";
import {
  createServiceUserAction,
  updateServiceUserAction,
  suspendServiceUserAction,
  resumeServiceUserAction,
} from "@/app/actions/serviceUsers";

interface ClientsPageContentProps {
  initialClients: ServiceUser[];
  initialFilter: "all" | "active" | "suspended";
  modalState: { mode: "create" | "edit"; clientId?: string } | null;
}

export const ClientsPageContent = ({
  initialClients,
  initialFilter,
  modalState,
}: ClientsPageContentProps) => {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "suspended">(initialFilter);

  // フィルター適用
  const filteredClients =
    filter === "all"
      ? initialClients
      : initialClients.filter((client) => client.contract_status === filter);

  // フィルター変更ハンドラー
  const handleFilterChange = (newFilter: "all" | "active" | "suspended") => {
    setFilter(newFilter);
    router.push(`/admin/clients?filter=${newFilter}`);
  };

  // 新規登録ボタンクリック
  const handleCreateClick = () => {
    router.push(`/admin/clients?filter=${filter}&modal=create`);
  };

  // 編集リンク生成
  const getEditHref = (client: ServiceUser) => {
    return `/admin/clients?filter=${filter}&modal=edit&id=${client.id}`;
  };

  // モーダルを閉じる
  const handleModalClose = () => {
    router.push(`/admin/clients?filter=${filter}`);
  };

  // 新規作成ハンドラー
  const handleCreate = async (data: ServiceUserInput) => {
    try {
      const result = await createServiceUserAction(data);
      if (result.error) {
        console.error("Failed to create service user:", result.error);
        // TODO: エラートースト表示
        return;
      }

      // 成功したらモーダルを閉じる
      handleModalClose();

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (error) {
      console.error("Failed to create client:", error);
      // TODO: エラートースト表示
    }
  };

  // 編集ハンドラー
  const handleEdit = async (
    data: ServiceUserInput,
    contractStatus?: ContractStatus
  ) => {
    if (!editingClient) return;

    try {
      // 基本情報の更新
      const result = await updateServiceUserAction(editingClient.id, data);
      if (result.error) {
        console.error("Failed to update service user:", result.error);
        // TODO: エラートースト表示
        return;
      }

      // 契約ステータスが変更された場合
      if (contractStatus && contractStatus !== editingClient.contract_status) {
        const statusResult =
          contractStatus === "suspended"
            ? await suspendServiceUserAction(editingClient.id)
            : await resumeServiceUserAction(editingClient.id);

        if (statusResult.error) {
          console.error("Failed to update contract status:", statusResult.error);
          // TODO: エラートースト表示
          return;
        }
      }

      // 成功したらモーダルを閉じる
      handleModalClose();

      // ページをリフレッシュしてデータを再取得
      router.refresh();
    } catch (error) {
      console.error("Failed to edit client:", error);
      // TODO: エラートースト表示
    }
  };

  // 編集対象の利用者を取得
  const editingClient = modalState?.clientId
    ? initialClients.find((c) => c.id === modalState.clientId)
    : undefined;

  return (
    <>
      {/* 新規登録ボタン */}
      <div className="mb-4">
        <button onClick={handleCreateClick} className="btn btn-primary">
          ＋ 新規登録
        </button>
      </div>

      {/* フィルタータブ */}
      <ClientFilterTabs activeFilter={filter} onFilterChange={handleFilterChange} />

      {/* テーブル */}
      <div className="mt-4">
        <ClientTable clients={filteredClients} getHref={getEditHref} />
      </div>

      {/* モーダル */}
      {modalState?.mode === "create" && (
        <ClientModal
          isOpen={true}
          mode="create"
          onClose={handleModalClose}
          onSubmit={handleCreate}
        />
      )}
      {modalState?.mode === "edit" && editingClient && (
        <ClientModal
          isOpen={true}
          mode="edit"
          client={editingClient}
          onClose={handleModalClose}
          onSubmit={handleEdit}
        />
      )}
    </>
  );
};
