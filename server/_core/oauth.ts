import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Completes the Nexuss Auth cross-site handoff. The single-use handoff token is
 * exchanged only on this trusted server, then discarded before redirecting home.
 */
export async function completeNexussHandoff(req: Request, res: Response) {
  const handoffToken = getQueryParam(req, "handoff_token");
  if (!handoffToken) {
    res.status(400).json({ error: "handoff_token is required" });
    return;
  }

  try {
    const identity = await sdk.exchangeNexussHandoff(handoffToken);
    const openId = `nexuss:${identity.id}`;

    await db.upsertUser({
      openId,
      name: identity.name,
      email: identity.email,
      loginMethod: "nexuss",
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name: identity.name ?? "",
      expiresInMs: ONE_YEAR_MS,
    });
    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });
    res.redirect(302, "/");
  } catch (error) {
    console.error("[Nexuss Auth] Handoff callback failed", error instanceof Error ? error.message : "Unknown error");
    res.status(401).json({ error: "Nexuss Auth handoff could not be completed" });
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get(["/auth/callback", "/api/auth/callback"], completeNexussHandoff);
}
