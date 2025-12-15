import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Admin/Clients/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const Suspended: Story = {
  args: {
    status: "suspended",
  },
};

export const Comparison: Story = {
  args: {
    status: "active",
  },
  render: () => (
    <div className="flex gap-4">
      <StatusBadge status="active" />
      <StatusBadge status="suspended" />
    </div>
  ),
};
