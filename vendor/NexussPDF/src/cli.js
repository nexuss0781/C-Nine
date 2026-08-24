#!/usr/bin/env node
import { extractPdf } from './index.js';

const [, , filePath, ...args] = process.argv;
if (!filePath) {
  console.error('Usage: nexuss-pdf <file.pdf> [--no-ocr] [--dpi 200] [--language eng]');
  process.exit(2);
}
const options = { ocr: !args.includes('--no-ocr') };
const dpi = args.indexOf('--dpi');
if (dpi >= 0) options.dpi = Number(args[dpi + 1]);
const language = args.indexOf('--language');
if (language >= 0) options.language = args[language + 1];
try {
  const result = await extractPdf(filePath, options);
  console.error(JSON.stringify({ method: result.method, pages: result.metadata.pageCount, characters: result.text.length }, null, 2));
  process.stdout.write(`${result.text}\n`);
} catch (error) {
  console.error(error?.stack ?? error);
  process.exit(1);
}
