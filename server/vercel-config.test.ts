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
      { source: "/auth/callback", destination: "/api/auth/callback" },
      { source: "/api/(.*)", destination: "/api" },
      { source: "/(.*)", destination: "/index.html" },
    ]));
  });

  it("builds a bundled Vercel API entrypoint", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts?: { build?: unknown };
    };

    expect(packageJson.scripts?.build).toContain("esbuild api/index.ts");
    expect(packageJson.scripts?.build).toContain("--outfile=api/index.js");
  });

  it("documents the Nexuss handoff variables without deploying the management credential", async () => {
    const runbook = await readFile(new URL("../VERCEL_DEPLOYMENT.md", import.meta.url), "utf8");

    expect(runbook).toContain("Application Preset | **Other**");
    expect(runbook).toContain("VITE_NEXUSS_AUTH_URL");
    expect(runbook).toContain("VITE_NEXUSS_AUTH_PROJECT_ID");
    expect(runbook).toContain("VITE_NEXUSS_AUTH_REDIRECT_URI");
    expect(runbook).toContain("CRON_SECRET");
    expect(runbook).toContain("Do **not** set it in Vercel");
  });
});
