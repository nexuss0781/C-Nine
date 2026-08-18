import { afterEach, describe, expect, it, vi } from "vitest";

describe("Nexuss Auth server handoff", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges the one-time token only with the configured project and never sends a management key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      user: { id: "identity-1", email: "user@example.com", name: "C-Nine User", avatarUrl: null },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const { sdk } = await import("./_core/sdk");

    const user = await sdk.exchangeNexussHandoff("single-use-token");
    const [endpoint, init] = fetchMock.mock.calls[0] ?? [];

    expect(String(endpoint)).toBe(`${process.env.NEXUSS_AUTH_URL}/v1/handoff/exchange`);
    expect(init).toMatchObject({ method: "POST", headers: { "content-type": "application/json" } });
    expect(String(init?.body)).toContain('"projectId":"c-nine-study"');
    expect(String(init?.body)).not.toContain("nxa_");
    expect(user).toMatchObject({ id: "identity-1", email: "user@example.com" });
  });

  it("binds application sessions to the configured Nexuss project", async () => {
    const { sdk } = await import("./_core/sdk");
    const session = await sdk.createSessionToken("nexuss:identity-1", { name: "C-Nine User" });

    await expect(sdk.verifySession(session)).resolves.toMatchObject({
      openId: "nexuss:identity-1",
      projectId: "c-nine-study",
    });
  });
});
