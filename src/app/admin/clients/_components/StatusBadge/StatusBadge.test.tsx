import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("契約中(active)で「契約中」が表示される", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("契約中")).toBeInTheDocument();
  });

  it("中断中(suspended)で「中断中」が表示される", () => {
    render(<StatusBadge status="suspended" />);
    expect(screen.getByText("中断中")).toBeInTheDocument();
  });

  it("契約中(active)で適切なスタイルが適用される", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.querySelector(".badge");
    expect(badge).toHaveClass("badge-success");
  });

  it("中断中(suspended)で適切なスタイルが適用される", () => {
    const { container } = render(<StatusBadge status="suspended" />);
    const badge = container.querySelector(".badge");
    expect(badge).toHaveClass("badge-warning");
  });

  it("中断中(suspended)で警告アイコンが表示される", () => {
    const { container } = render(<StatusBadge status="suspended" />);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("契約中(active)では警告アイコンが表示されない", () => {
    const { container } = render(<StatusBadge status="active" />);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeInTheDocument();
  });
});
