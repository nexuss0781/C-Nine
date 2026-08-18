import { addProcessingEvent, getDocumentForUser, listDocumentsAwaitingExtraction, updateDocumentProcessingForUser, upsertExtractedTextForUser, type PageMapEntry } from "./db";
import { storageGetSignedUrl } from "./storage";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function loadPdfJs(): Promise<PdfJsModule> {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function extractPdfText(bytes: Uint8Array) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: bytes, disableFontFace: true, useWorkerFetch: false });
  const pdf = await loadingTask.promise;
  const pageMap: PageMapEntry[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
      pageMap.push({ page: pageNumber, text });
    }
    return { pageCount: pdf.numPages, pageMap, text: pageMap.map(entry => `Page ${entry.page}\n${entry.text}`).join("\n\n") };
  } finally {
    await loadingTask.destroy();
  }
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

  await addProcessingEvent({ userId: document.userId, documentId: document.id, stage: "extract", status: "running", detail: "Periodic processor started extraction." });
  try {
    const bytes = await downloadStoredPdf(document.storageKey);
    const extracted = await extractPdfText(bytes);
    await upsertExtractedTextForUser({
      userId: document.userId,
      documentId: document.id,
      extractedText: extracted.text,
      pageMap: extracted.pageMap,
      pageCount: extracted.pageCount,
      extractorVersion: "pdfjs-6.2",
    });
    return { skipped: false as const, documentId: document.id, pageCount: extracted.pageCount };
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
