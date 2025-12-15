import type { ServiceUser } from "@/models/serviceUser";
import { StatusBadge } from "../StatusBadge";

export interface ClientTableProps {
  clients: ServiceUser[];
  onEdit: (client: ServiceUser) => void;
}

export const ClientTable = ({ clients, onEdit }: ClientTableProps) => {
  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/70">
        利用者がまだ登録されていません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>氏名</th>
            <th>住所</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.address}</td>
              <td>
                <StatusBadge status={client.contract_status} />
              </td>
              <td>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => onEdit(client)}
                >
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
