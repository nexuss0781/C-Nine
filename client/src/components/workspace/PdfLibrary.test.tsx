import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PdfLibrary } from "./PdfLibrary";
import type { WorkspaceDocument } from "@/lib/workspace";

const documents: WorkspaceDocument[] = [{
  id: "accessibility-document",
  filename: "accessible-reading.pdf",
  sizeBytes: 1_200_000,
  pageCount: 8,
  uploadedAt: "2026-08-18T10:00:00.000Z",
  status: "ready",
  source: "web",
}];

describe("PdfLibrary accessibility", () => {
  it("exposes named keyboard-reachable controls for opening, archiving, and deleting a document", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onArchive = vi.fn();
    const onDelete = vi.fn();

    render(<PdfLibrary documents={documents} onOpen={onOpen} onUpload={vi.fn()} onArchive={onArchive} onDelete={onDelete} />);

    expect(screen.getByRole("button", { name: "Add PDF" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Archive accessible-reading.pdf" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete accessible-reading.pdf" })).toBeVisible();

    const [documentButton] = screen.getAllByRole("button", { name: /accessible-reading\.pdf/ });
    documentButton.focus();
    expect(documentButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledWith("accessibility-document");
  });
});
