import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Vercel deployment configuration", () => {
  it("uses the Express-compatible preset contract and SPA/API rewrites", async () => {
    const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8")) as {
      framework?: unknown;
      buildCommand?: unknown;
      outputDirectory?: unknown;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    expect(config.framework).toBeNull();
    expect(config.buildCommand).toBe("pnpm build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toEqual(expect.arrayContaining([
      { source: "/api/(.*)", destination: "/api" },
      { source: "/(.*)", destination: "/index.html" },
    ]));
  });
});
