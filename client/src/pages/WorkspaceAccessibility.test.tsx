import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "client/src");

async function source(relativePath: string) {
  return readFile(resolve(root, relativePath), "utf8");
}

describe("workspace accessibility contract", () => {
  it("keeps named controls and visible focus affordances across core workspace regions", async () => {
    const [home, viewer, library, settings] = await Promise.all([
      source("pages/Home.tsx"),
      source("components/workspace/PdfViewer.tsx"),
      source("components/workspace/PdfLibrary.tsx"),
      source("components/workspace/AiSettingsDialog.tsx"),
    ]);

    expect(home).toContain('aria-label="Toggle navigation"');
    expect(viewer).toContain('aria-label="Zoom out"');
    expect(viewer).toContain('aria-label="Current page"');
    expect(library).toContain("Archive ${document.filename}");
    expect(library).toContain("Delete ${document.filename}");
    expect(settings).toContain('htmlFor="opencode-base-url"');
    expect(settings).toContain('htmlFor="opencode-api-key"');
    expect(library).toContain("focus-within");
  });
});
