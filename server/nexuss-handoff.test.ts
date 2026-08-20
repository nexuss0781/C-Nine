import { describe, expect, it } from "vitest";
import { buildNexussLoginUrl } from "../client/src/const";

describe("Nexuss Auth cross-site handoff", () => {
  it("builds a Google navigation URL with the exact C-Nine callback and handoff request", () => {
    const loginUrl = buildNexussLoginUrl(
      "https://nexuss-auth.vercel.app",
      "c-nine-study",
      "https://c-nine-gamma.vercel.app/auth/callback"
    );
    const parsed = new URL(loginUrl);

    expect(parsed.pathname).toBe("/oauth/start/google");
    expect(parsed.searchParams.get("project_id")).toBe("c-nine-study");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://c-nine-gamma.vercel.app/auth/callback");
    expect(parsed.searchParams.get("handoff")).toBe("1");
  });

  it("does not serialize a server-only project key into the browser login URL", () => {
    const loginUrl = buildNexussLoginUrl(
      "https://nexuss-auth.vercel.app",
      "c-nine-study",
      "https://c-nine-gamma.vercel.app/auth/callback"
    );
    expect(loginUrl).not.toContain("nxa_");
  });
});
