import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ClientTable } from "./ClientTable";
import type { ServiceUser } from "@/models/serviceUser";

const mockClients: ServiceUser[] = [
  {
    id: "019b179f-c8ec-7098-a1d7-7d2dc84f4b8d",
    office_id: "019b179f-c74d-75ef-a328-55a8f65a0d8a",
    name: "山田太郎",
    address: "東京都千代田区丸の内1-1-1",
    contract_status: "active",
    created_at: new Date("2025-12-13T10:00:00Z"),
    updated_at: new Date("2025-12-13T10:00:00Z"),
  },
  {
    id: "019b179f-ca00-7291-bb3a-9f2e8c5d1a7b",
    office_id: "019b179f-c74d-75ef-a328-55a8f65a0d8a",
    name: "佐藤花子",
    address: "東京都渋谷区神南1-2-3",
    contract_status: "suspended",
    created_at: new Date("2025-12-13T10:00:00Z"),
    updated_at: new Date("2025-12-13T11:00:00Z"),
  },
];

describe("ClientTable", () => {
  it("データが表示される", () => {
    render(<ClientTable clients={mockClients} onEdit={vi.fn()} />);

    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("東京都千代田区丸の内1-1-1")).toBeInTheDocument();
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("東京都渋谷区神南1-2-3")).toBeInTheDocument();
  });

  it("ステータスバッジが正しく表示される", () => {
    render(<ClientTable clients={mockClients} onEdit={vi.fn()} />);

    expect(screen.getByText("契約中")).toBeInTheDocument();
    expect(screen.getByText("中断中")).toBeInTheDocument();
  });

  it("編集ボタンが表示される", () => {
    render(<ClientTable clients={mockClients} onEdit={vi.fn()} />);

    const editButtons = screen.getAllByRole("button", { name: /編集/ });
    expect(editButtons).toHaveLength(2);
  });

  it("編集ボタンクリックでonEditが呼ばれる", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    render(<ClientTable clients={mockClients} onEdit={handleEdit} />);

    const editButtons = screen.getAllByRole("button", { name: /編集/ });
    await user.click(editButtons[0]);

    expect(handleEdit).toHaveBeenCalledWith(mockClients[0]);
  });

  it("データがない場合のメッセージが表示される", () => {
    render(<ClientTable clients={[]} onEdit={vi.fn()} />);

    expect(
      screen.getByText("利用者がまだ登録されていません")
    ).toBeInTheDocument();
  });

  it("データがない場合は編集ボタンが表示されない", () => {
    render(<ClientTable clients={[]} onEdit={vi.fn()} />);

    const editButtons = screen.queryAllByRole("button", { name: /編集/ });
    expect(editButtons).toHaveLength(0);
  });
});
