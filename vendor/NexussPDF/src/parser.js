import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const MAX_PAGES = 2000;
export const MAX_TEXT_BYTES = 50 * 1024 * 1024;

/**
 * Extract selectable text from a PDF ArrayBuffer.
 * This is the standalone equivalent of vault-operator's PdfParser.parsePdf().
 */
export async function parsePdf(data, options = {}) {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const maxTextBytes = options.maxTextBytes ?? MAX_TEXT_BYTES;
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data.slice(0)),
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const parts = [];
  const pageLimit = Math.min(pdf.numPages, maxPages);
  let accumulatedBytes = 0;
  let truncatedByBytes = false;
  let pagesProcessed = 0;

  for (let pageNum = 1; pageNum <= pageLimit; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => item.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pagesProcessed = pageNum;
    if (!pageText) continue;
    const block = `## Page ${pageNum}\n\n${pageText}`;
    const blockBytes = Buffer.byteLength(block, 'utf8');
    if (accumulatedBytes + blockBytes > maxTextBytes) {
      truncatedByBytes = true;
      break;
    }
    parts.push(block);
    accumulatedBytes += blockBytes;
  }

  if (pdf.numPages > maxPages) {
    parts.push(`(truncated: PDF has ${pdf.numPages} pages, only the first ${maxPages} were parsed)`);
  } else if (truncatedByBytes) {
    parts.push(`(truncated: text output exceeded ${maxTextBytes} bytes after page ${pagesProcessed})`);
  }

  const text = parts.length > 0
    ? parts.join('\n\n')
    : '(No extractable text found — this PDF may be image-based/scanned.)';
  return { text, images: [], metadata: { format: 'pdf', pageCount: pdf.numPages, selectable: parts.length > 0 } };
}

export function hasExtractableText(result) {
  return Boolean(result?.text) && !result.text.includes('No extractable text found');
}
