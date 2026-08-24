import { addProcessingEvent, getDocumentForUser, listDocumentsAwaitingExtraction, updateDocumentProcessingForUser, upsertExtractedTextForUser } from "./db";
import { storageGetSignedUrl } from "./storage";
import { extractPdfText as extractNexussPdfText } from "./pdfEngine";

export const NEXUSSPDF_EXTRACTOR_VERSION = "nexusspdf-pdfjs-6.2-tesseractjs-7";

/**
 * C-NINE PDF extraction boundary backed by the standalone NexussPDF engine.
 * Selectable PDFs use PDF.js; image-only PDFs use embedded-image OCR.
 */
export async function extractPdfText(bytes: Uint8Array) {
  return extractNexussPdfText(bytes, {
    ocr: true,
    language: process.env.PDF_OCR_LANGUAGE ?? "eng",
    keepWorkerWarm: process.env.VERCEL === "1",
  });
}

async function downloadStoredPdf(storageKey: string) {
  const url = await storageGetSignedUrl(storageKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Stored PDF download failed (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

async function processOneDocument(document: Awaited<ReturnType<typeof listDocumentsAwaitingExtraction>>[number]) {
  const ownedDocument = await getDocumentForUser(document.userId, document.id);
  if (!ownedDocument || ownedDocument.status !== "processing") return { skipped: true as const, documentId: document.id };

  await addProcessingEvent({ userId: document.userId, documentId: document.id, stage: "extract", status: "running", detail: "NexussPDF processor started extraction." });
  try {
    const bytes = await downloadStoredPdf(document.storageKey);
    const extracted = await extractPdfText(bytes);
    await upsertExtractedTextForUser({
      userId: document.userId,
      documentId: document.id,
      extractedText: extracted.text,
      pageMap: extracted.pageMap,
      pageCount: extracted.pageCount,
      extractorVersion: extracted.extractorVersion ?? NEXUSSPDF_EXTRACTOR_VERSION,
    });
    return { skipped: false as const, documentId: document.id, pageCount: extracted.pageCount, method: extracted.method };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 900) : "Unknown PDF extraction failure";
    await updateDocumentProcessingForUser({ userId: document.userId, documentId: document.id, status: "failed" });
    await addProcessingEvent({ userId: document.userId, documentId: document.id, stage: "extract", status: "failed", detail, completed: true });
    return { skipped: false as const, documentId: document.id, error: detail };
  }
}

export async function processQueuedPdfExtractions(limit = 3) {
  const queue = await listDocumentsAwaitingExtraction(limit);
  const results = [];
  for (const document of queue) results.push(await processOneDocument(document));
  return { scanned: queue.length, results };
}
