import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPdf } from '../src/index.js';

test('selectable PDF extracts through PDF.js with page headings', async () => {
  const result = await extractPdf('test/fixtures/selectable.pdf', { ocr: false });
  assert.equal(result.method, 'pdfjs');
  assert.equal(result.metadata.pageCount, 2);
  assert.match(result.text, /## Page 1/);
  assert.match(result.text, /Selectable text should be extracted exactly/);
  assert.match(result.text, /## Page 2/);
});

test('scanned PDF returns the explicit no-text marker without OCR', async () => {
  const result = await extractPdf('test/fixtures/scanned.pdf', { ocr: false });
  assert.equal(result.method, 'pdfjs');
  assert.match(result.text, /No extractable text found/);
});

test('scanned PDF uses OCR fallback end to end', async () => {
  const result = await extractPdf('test/fixtures/scanned.pdf', { dpi: 200 });
  assert.equal(result.method, 'ocr');
  assert.equal(result.metadata.pageCount, 2);
  assert.match(result.text, /OCR page one/);
  assert.match(result.text, /OCR page two/);
  assert.match(result.text, /## Page 1/);
  assert.match(result.text, /## Page 2/);
});
