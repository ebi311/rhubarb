import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LoginButton from "./LoginButton";

const meta: Meta<typeof LoginButton> = {
  title: "Login/LoginButton",
  component: LoginButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof LoginButton>;

export const Default: Story = {};
