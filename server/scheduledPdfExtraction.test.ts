import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./pdfExtraction", () => ({
  processQueuedPdfExtractions: vi.fn(),
}));

import { processQueuedPdfExtractions } from "./pdfExtraction";
import { runQueuedPdfExtraction } from "./scheduledPdfExtraction";

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return response;
}

describe("queued PDF extraction scheduler", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.clearAllMocks();
  });

  it("rejects requests before a cron secret is configured", async () => {
    const res = createResponse();
    await runQueuedPdfExtraction({ header: vi.fn() } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("runs only for a request authorized with the configured secret", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    vi.mocked(processQueuedPdfExtractions).mockResolvedValue({ processed: 1, failed: 0, skipped: 0 } as any);
    const res = createResponse();
    await runQueuedPdfExtraction({ header: vi.fn().mockReturnValue("Bearer test-cron-secret"), path: "/api/scheduled/extractQueuedPdfs" } as any, res as any);
    expect(processQueuedPdfExtractions).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
