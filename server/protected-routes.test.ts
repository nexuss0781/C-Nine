import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("protected workspace procedures", () => {
  it("rejects unauthenticated calls before any document, note, history, or file-access query executes", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());

    await expect(caller.documents.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.documents.fileAccess({ documentId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.notes.get({ documentId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.history.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
