import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookOpenText, Sparkles } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";

describe("workspace panel tabs", () => {
  it("keeps panel choices keyboard reachable and activates the focused tab with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<WorkspaceTabs items={[
      { id: "notes", label: "Notes", icon: BookOpenText },
      { id: "chat", label: "Assistant", icon: Sparkles },
    ]} active="notes" onSelect={onSelect} label="notes" />);

    const assistant = screen.getByRole("button", { name: "Assistant" });
    assistant.focus();
    expect(assistant).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("chat");
  });
});
