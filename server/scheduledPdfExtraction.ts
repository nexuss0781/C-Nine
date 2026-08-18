import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { processQueuedPdfExtractions } from "./pdfExtraction";

function hasValidCronAuthorization(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.header("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice(7);
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function runQueuedPdfExtraction(req: Request, res: Response) {
  if (!process.env.CRON_SECRET) {
    return res.status(503).json({ error: "cron-not-configured" });
  }
  if (!hasValidCronAuthorization(req)) {
    return res.status(403).json({ error: "cron-only" });
  }

  try {
    const result = await processQueuedPdfExtractions(3);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction scheduler error";
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: req.path } });
  }
}
