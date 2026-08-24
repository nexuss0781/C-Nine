import type { PageMapEntry } from "./db";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfImage = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

type ExtractionOptions = {
  ocr?: boolean;
  language?: string;
  keepWorkerWarm?: boolean;
};

let pdfjsPromise: Promise<PdfJsModule> | undefined;
let ocrWorkerPromise: Promise<any> | undefined;

async function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsPromise;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function pageTextFromMap(pageMap: PageMapEntry[]) {
  return pageMap.map(entry => `Page ${entry.page}\n${entry.text}`).join("\n\n");
}

async function extractSelectableText(bytes: Uint8Array) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;
  const pageMap: PageMapEntry[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizeText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      pageMap.push({ page: pageNumber, text });
    }
    return { pageCount: pdf.numPages, pageMap, text: pageTextFromMap(pageMap) };
  } finally {
    await loadingTask.destroy();
  }
}

function imageNames(operatorList: { argsArray: unknown[][] }) {
  return Array.from(new Set(operatorList.argsArray
    .filter(args => Array.isArray(args) && typeof args[0] === "string" && args[0].startsWith("img_"))
    .map(args => args[0] as string)));
}

function getPageImage(page: any, name: string): Promise<PdfImage> {
  return new Promise((resolve, reject) => {
    try {
      page.objs.get(name, (object: PdfImage) => resolve(object));
    } catch (error) {
      reject(error);
    }
  });
}

async function imageToPng(image: PdfImage) {
  const { PNG } = await import("pngjs");
  const { width, height } = image;
  const source = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  const rgba = Buffer.alloc(width * height * 4);
  if (source.length === rgba.length) {
    source.copy(rgba);
  } else if (source.length === width * height * 3) {
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 3, targetIndex += 4) {
      rgba[targetIndex] = source[sourceIndex];
      rgba[targetIndex + 1] = source[sourceIndex + 1];
      rgba[targetIndex + 2] = source[sourceIndex + 2];
      rgba[targetIndex + 3] = 255;
    }
  } else if (source.length === width * height) {
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 1, targetIndex += 4) {
      rgba[targetIndex] = source[sourceIndex];
      rgba[targetIndex + 1] = source[sourceIndex];
      rgba[targetIndex + 2] = source[sourceIndex];
      rgba[targetIndex + 3] = 255;
    }
  } else {
    throw new Error(`Unsupported embedded PDF image buffer: ${source.length} bytes for ${width}x${height}`);
  }
  return PNG.sync.write({ width, height, data: rgba } as any);
}

async function loadOcrWorker(language: string) {
  if (!ocrWorkerPromise) {
    const { createWorker } = await import("tesseract.js");
    ocrWorkerPromise = createWorker(language);
  }
  return ocrWorkerPromise;
}

async function extractScannedText(bytes: Uint8Array, options: ExtractionOptions, pageCount: number) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false }).promise;
  const worker = await loadOcrWorker(options.language ?? "eng");
  const pageMap: PageMapEntry[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const operators = await page.getOperatorList();
    const names = imageNames(operators);
    let text = "";
    if (names.length > 0) {
      const images = await Promise.all(names.map(name => getPageImage(page, name)));
      const image = images.sort((left, right) => right.width * right.height - left.width * left.height)[0];
      const png = await imageToPng(image);
      const result = await worker.recognize(png);
      text = normalizeText(result.data.text);
    }
    pageMap.push({ page: pageNumber, text });
  }
  if (options.keepWorkerWarm !== true) {
    await worker.terminate();
    ocrWorkerPromise = undefined;
  }
  return { pageCount, pageMap, text: pageTextFromMap(pageMap) };
}

export async function extractPdfText(bytes: Uint8Array, options: ExtractionOptions = {}) {
  const selectable = await extractSelectableText(bytes);
  const hasText = selectable.pageMap.some(entry => entry.text.length > 0);
  if (hasText || options.ocr === false) {
    return { ...selectable, method: "pdfjs" as const, extractorVersion: "nexusspdf-pdfjs-6.2" };
  }
  const scanned = await extractScannedText(bytes, options, selectable.pageCount);
  return { ...scanned, method: "tesseractjs" as const, extractorVersion: "nexusspdf-pdfjs-6.2-tesseractjs-7" };
}
