import { describe, expect, it } from "vitest";

const authUrl = process.env.NEXUSS_AUTH_URL ?? "https://nexuss-auth.vercel.app";
const projectToken = process.env.NEXUSS_AUTH_KEY;

describe("Nexuss Auth project credential", () => {
  it("authenticates to the scoped project-list endpoint without exposing the token", async () => {
    expect(projectToken).toMatch(/^nxa_/);

    const response = await fetch(`${authUrl.replace(/\/$/, "")}/v1/projects`, {
      headers: { authorization: `Bearer ${projectToken}` },
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as { projects?: unknown[] };
    expect(Array.isArray(payload.projects)).toBe(true);
  });
});
