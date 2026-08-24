import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PNG } from 'pngjs';
import { createWorker } from 'tesseract.js';

/**
 * Serverless OCR path. It avoids apt packages, child processes, and native
 * canvas modules. PDF.js exposes the embedded page image for image-only PDFs;
 * pngjs converts that raw image data to a PNG buffer for Tesseract.js.
 */
let workerPromise;

async function getWorker(language) {
  if (!workerPromise) workerPromise = createWorker(language);
  return workerPromise;
}

function objectToPng(object) {
  const { width, height, data } = object;
  const rgba = Buffer.alloc(width * height * 4);
  const pixels = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (pixels.length === width * height * 4) {
    pixels.copy(rgba);
  } else if (pixels.length === width * height * 3) {
    for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
      rgba[j] = pixels[i]; rgba[j + 1] = pixels[i + 1]; rgba[j + 2] = pixels[i + 2]; rgba[j + 3] = 255;
    }
  } else if (pixels.length === width * height) {
    for (let i = 0, j = 0; i < pixels.length; i += 1, j += 4) {
      rgba[j] = pixels[i]; rgba[j + 1] = pixels[i]; rgba[j + 2] = pixels[i]; rgba[j + 3] = 255;
    }
  } else {
    throw new Error(`Unsupported PDF image buffer: ${pixels.length} bytes for ${width}x${height}`);
  }
  return PNG.sync.write({ width, height, data: rgba });
}

function getImageNames(operatorList) {
  return [...new Set(operatorList.argsArray
    .filter((args) => Array.isArray(args) && typeof args[0] === 'string' && args[0].startsWith('img_'))
    .map((args) => args[0]))];
}

function getPageImage(page, name) {
  return new Promise((resolve, reject) => {
    try {
      page.objs.get(name, (object) => resolve(object));
    } catch (error) { reject(error); }
  });
}

export async function ocrPdfVercel(data, options = {}) {
  const language = options.language ?? 'eng';
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(data.slice(0)),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const worker = await getWorker(language);
  const parts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const operatorList = await page.getOperatorList();
    const names = getImageNames(operatorList);
    if (!names.length) continue;
    const objects = await Promise.all(names.map((name) => getPageImage(page, name)));
    const image = objects.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    const { data: result } = await worker.recognize(objectToPng(image));
    const text = result.text.replace(/\s+/g, ' ').trim();
    if (text) parts.push(`## Page ${pageNum}\n\n${text}`);
  }
  if (options.keepWorkerWarm !== true) {
    await worker.terminate();
    workerPromise = undefined;
  }
  return { text: parts.join('\n\n') || '(OCR found no text.)', pageCount: pdf.numPages, language };
}
