import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ClientFilterTabs } from "./ClientFilterTabs";

const meta = {
  title: "Admin/Clients/ClientFilterTabs",
  component: ClientFilterTabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onFilterChange: fn(),
  },
} satisfies Meta<typeof ClientFilterTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  args: {
    activeFilter: "all",
  },
};

export const Active: Story = {
  args: {
    activeFilter: "active",
  },
};

export const Suspended: Story = {
  args: {
    activeFilter: "suspended",
  },
};
