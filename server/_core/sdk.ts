import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  projectId: string;
  name: string;
};

export type NexussIdentity = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    return new Map(Object.entries(parseCookieHeader(cookieHeader ?? "")));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async exchangeNexussHandoff(handoffToken: string): Promise<NexussIdentity> {
    if (!isNonEmptyString(ENV.nexussAuthUrl) || !isNonEmptyString(ENV.nexussProjectId)) {
      throw new Error("Nexuss Auth routing is not configured");
    }

    const response = await fetch(`${ENV.nexussAuthUrl}/v1/handoff/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: ENV.nexussProjectId, handoffToken }),
    });

    if (!response.ok) {
      throw new Error(`Nexuss Auth handoff failed with status ${response.status}`);
    }

    const payload = await response.json() as { user?: NexussIdentity };
    if (!payload.user || !isNonEmptyString(payload.user.id)) {
      throw new Error("Nexuss Auth handoff response did not include a user");
    }
    return payload.user;
  }

  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}) {
    return this.signSession({
      openId,
      projectId: ENV.nexussProjectId,
      name: options.name ?? "",
    }, options);
  }

  async signSession(payload: SessionPayload, options: { expiresInMs?: number } = {}) {
    const expirationSeconds = Math.floor((Date.now() + (options.expiresInMs ?? ONE_YEAR_MS)) / 1000);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), { algorithms: ["HS256"] });
      const { openId, projectId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || projectId !== ENV.nexussProjectId || typeof name !== "string") return null;
      return { openId, projectId, name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const sessionToken = this.parseCookies(req.headers.cookie).get(COOKIE_NAME);
    const session = await this.verifySession(sessionToken);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export type AuthenticatedUser = User & { taskUid?: string; isCron?: boolean };

export const sdk = new SDKServer();
