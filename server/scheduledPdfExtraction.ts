import type { Request, Response } from "express";
import { processQueuedPdfExtractions } from "./pdfExtraction";
import { sdk } from "./_core/sdk";

export async function runQueuedPdfExtraction(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await processQueuedPdfExtractions(3);
    return res.json({ ok: true, taskUid: user.taskUid, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction scheduler error";
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: req.path } });
  }
}
