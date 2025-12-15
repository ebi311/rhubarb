import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ClientModal } from "./ClientModal";
import type { ServiceUser } from "@/models/serviceUser";

const mockClient: ServiceUser = {
  id: "019b179f-c8ec-7098-a1d7-7d2dc84f4b8d",
  office_id: "019b179f-c74d-75ef-a328-55a8f65a0d8a",
  name: "山田太郎",
  address: "東京都千代田区丸の内1-1-1",
  contract_status: "active",
  created_at: new Date("2025-12-13T10:00:00Z"),
  updated_at: new Date("2025-12-13T10:00:00Z"),
};

const mockSuspendedClient: ServiceUser = {
  ...mockClient,
  id: "019b179f-ca00-7291-bb3a-9f2e8c5d1a7b",
  name: "佐藤花子",
  address: "東京都渋谷区神南1-2-3",
  contract_status: "suspended",
  updated_at: new Date("2025-12-13T11:00:00Z"),
};

const meta = {
  title: "Admin/Clients/ClientModal",
  component: ClientModal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof ClientModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  args: {
    mode: "create",
  },
};

export const EditActive: Story = {
  args: {
    mode: "edit",
    client: mockClient,
  },
};

export const EditSuspended: Story = {
  args: {
    mode: "edit",
    client: mockSuspendedClient,
  },
};
