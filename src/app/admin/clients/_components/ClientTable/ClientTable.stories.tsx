import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
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
  {
    id: "019b179f-cccc-cccc-cccc-cccccccccccc",
    office_id: "019b179f-c74d-75ef-a328-55a8f65a0d8a",
    name: "鈴木一郎",
    address: "東京都新宿区西新宿2-8-1",
    contract_status: "active",
    created_at: new Date("2025-12-13T12:00:00Z"),
    updated_at: new Date("2025-12-13T12:00:00Z"),
  },
];

const meta = {
  title: "Admin/Clients/ClientTable",
  component: ClientTable,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    onEdit: fn(),
  },
} satisfies Meta<typeof ClientTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  args: {
    clients: mockClients,
  },
};

export const Empty: Story = {
  args: {
    clients: [],
  },
};

export const OnlyActive: Story = {
  args: {
    clients: mockClients.filter((c) => c.contract_status === "active"),
  },
};

export const OnlySuspended: Story = {
  args: {
    clients: mockClients.filter((c) => c.contract_status === "suspended"),
  },
};
