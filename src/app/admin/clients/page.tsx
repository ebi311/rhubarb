import { Suspense } from "react";
import { ClientsPageContent } from "./_components/ClientsPageContent";
import { getServiceUsersAction } from "@/app/actions/serviceUsers";
import type { ServiceUser } from "@/models/serviceUser";

interface PageProps {
  searchParams: Promise<{
    modal?: "create" | "edit";
    id?: string;
    filter?: "all" | "active" | "suspended";
  }>;
}

const ClientsPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const filter = (params.filter as "all" | "active" | "suspended") || "active";

  // Server Actionを使って利用者データを取得
  const result = await getServiceUsersAction("all");
  
  if (result.error) {
    console.error("Failed to fetch service users:", result.error);
  }

  const clients: ServiceUser[] = result.data || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">利用者管理</h1>

      <Suspense fallback={<div className="loading loading-spinner loading-lg"></div>}>
        <ClientsPageContent
          initialClients={clients}
          initialFilter={filter}
          modalState={
            params.modal
              ? {
                  mode: params.modal,
                  clientId: params.id,
                }
              : null
          }
        />
      </Suspense>
    </div>
  );
};

export default ClientsPage;
