import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { maskSecret } from "./secretCrypto";
import type { TrpcContext } from "./_core/context";

function createAuthenticatedContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 9,
      openId: "workspace-test-user",
      name: "Workspace Test User",
      email: "workspace@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("documents.upload", () => {
  it("rejects a file that lacks the required PDF signature before storage is called", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.documents.upload({
      filename: "not-a-pdf.pdf",
      mimeType: "application/pdf",
      base64: Buffer.from("plain text file").toString("base64"),
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("server-only AI key masking", () => {
  it("returns a redacted value that preserves only the final four characters", () => {
    expect(maskSecret("oc_live_12345678")).toMatch(/•+5678$/);
    expect(maskSecret("oc_live_12345678")).not.toContain("1234");
  });
});
