import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const baseContext = {
    req: opts.req,
    res: opts.res,
    user: null as User | null,
  };

  // `auth.me` is intentionally public. Avoid touching JWT or database code on
  // the common first-page request when the browser has no session cookie.
  const cookieHeader = opts.req.headers.cookie;
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return baseContext;
  }

  try {
    return {
      ...baseContext,
      user: await sdk.authenticateRequest(opts.req),
    };
  } catch (error) {
    // Authentication is optional for public procedures. Invalid or stale
    // cookies must resolve to an unauthenticated context, not a 500 response.
    return baseContext;
  }
}
