import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

describe("auth.me", () => {
  it("returns null without invoking authenticated request handling when no cookie is present", async () => {
    const context = await createContext({
      req: { headers: {} } as any,
      res: {} as any,
    });

    expect(context.user).toBeNull();
    await expect(appRouter.createCaller(context).auth.me()).resolves.toBeNull();
  });

  it("treats a stale or malformed session cookie as unauthenticated", async () => {
    const context = await createContext({
      req: { headers: { cookie: "app_session_id=not-a-valid-jwt" } } as any,
      res: {} as any,
    });

    expect(context.user).toBeNull();
    await expect(appRouter.createCaller(context).auth.me()).resolves.toBeNull();
  });
});
