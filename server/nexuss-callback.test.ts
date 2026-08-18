import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeNexussHandoff: vi.fn(),
  createSessionToken: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { exchangeNexussHandoff: mocks.exchangeNexussHandoff, createSessionToken: mocks.createSessionToken } }));
vi.mock("./db", () => ({ upsertUser: mocks.upsertUser }));
vi.mock("./_core/cookies", () => ({ getSessionCookieOptions: vi.fn(() => ({ httpOnly: true, secure: true, sameSite: "none", path: "/" })) }));

import { completeNexussHandoff } from "./_core/oauth";

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
}

describe("Nexuss Auth callback", () => {
  afterEach(() => vi.clearAllMocks());

  it("issues an application session cookie after a successful trusted handoff", async () => {
    mocks.exchangeNexussHandoff.mockResolvedValue({ id: "identity-1", name: "C-Nine User", email: "user@example.com", avatarUrl: null });
    mocks.createSessionToken.mockResolvedValue("signed-session");
    const res = response();

    await completeNexussHandoff({ query: { handoff_token: "single-use" } } as any, res as any);

    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "nexuss:identity-1", loginMethod: "nexuss" }));
    expect(res.cookie).toHaveBeenCalledWith("app_session_id", "signed-session", expect.objectContaining({ httpOnly: true, secure: true }));
    expect(res.redirect).toHaveBeenCalledWith(302, "/");
  });

  it("rejects a callback that does not include a handoff token", async () => {
    const res = response();
    await completeNexussHandoff({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.exchangeNexussHandoff).not.toHaveBeenCalled();
  });

  it("rejects an invalid or replayed handoff token without issuing a second session", async () => {
    mocks.exchangeNexussHandoff
      .mockResolvedValueOnce({ id: "identity-1", name: "C-Nine User", email: "user@example.com", avatarUrl: null })
      .mockRejectedValueOnce(new Error("Nexuss Auth handoff failed with status 401"));
    mocks.createSessionToken.mockResolvedValue("signed-session");
    const first = response();
    const replay = response();

    await completeNexussHandoff({ query: { handoff_token: "single-use" } } as any, first as any);
    await completeNexussHandoff({ query: { handoff_token: "single-use" } } as any, replay as any);

    expect(first.redirect).toHaveBeenCalledWith(302, "/");
    expect(replay.status).toHaveBeenCalledWith(401);
    expect(replay.cookie).not.toHaveBeenCalled();
  });
});
