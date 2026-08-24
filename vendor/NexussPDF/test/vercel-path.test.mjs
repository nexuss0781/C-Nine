import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractPdfBuffer } from '../src/index.js';

test('Vercel-compatible buffer path extracts selectable PDF without OCR', async () => {
  const file = await readFile('test/fixtures/selectable.pdf');
  const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const result = await extractPdfBuffer(data, { runtime: 'vercel', ocr: false });
  assert.equal(result.method, 'pdfjs');
  assert.equal(result.metadata.pageCount, 2);
  assert.match(result.text, /Selectable text should be extracted exactly/);
});

test('Vercel-compatible buffer path performs scanned-PDF OCR', async () => {
  const file = await readFile('test/fixtures/scanned.pdf');
  const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const result = await extractPdfBuffer(data, { runtime: 'vercel', scale: 1.5, language: 'eng' });
  assert.equal(result.method, 'ocr');
  assert.equal(result.metadata.pageCount, 2);
  assert.match(result.text, /OCR page one/);
  assert.match(result.text, /OCR page two/);
});
