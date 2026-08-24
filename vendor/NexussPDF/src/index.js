import { readFile } from 'node:fs/promises';
import { parsePdf, hasExtractableText } from './parser.js';
import { ocrPdf } from './ocr.js';
import { ocrPdfVercel } from './ocr-vercel.js';

export { parsePdf, hasExtractableText, ocrPdf };

/** End-to-end extraction from a PDF file path. */
export async function extractPdf(filePath, options = {}) {
  const data = await readFile(filePath);
  return extractPdfBuffer(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), options, filePath);
}

/** End-to-end extraction from an ArrayBuffer, suitable for HTTP uploads. */
export async function extractPdfBuffer(data, options = {}, filePath = null) {
  const parsed = await parsePdf(data, options);
  if (hasExtractableText(parsed) || options.ocr === false) {
    return { ...parsed, method: 'pdfjs' };
  }
  const ocr = options.runtime === 'vercel' || process.env.VERCEL === '1'
    ? await ocrPdfVercel(data, options)
    : await ocrPdf(filePath, options);
  return { text: ocr.text, images: [], metadata: { format: 'pdf', pageCount: ocr.pageCount }, method: 'ocr', ocr };
}
