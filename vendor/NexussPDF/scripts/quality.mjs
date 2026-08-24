import { readFile } from 'node:fs/promises';
import { extractPdf } from '../src/index.js';

function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    let left = i + 1;
    for (let j = 0; j < b.length; j += 1) {
      const next = Math.min(prev[j + 1] + 1, left + 1, prev[j] + (a[i] === b[j] ? 0 : 1));
      prev[j] = left; left = next;
    }
    prev[b.length] = left;
  }
  return prev[b.length];
}
const expectedSelectable = 'NexussPDF benchmark page one. Selectable text should be extracted exactly. NexussPDF benchmark page two. Page headings and ordering must be preserved.';
const expectedOcr = 'NexussPDF OCR page one. Scanned text. NexussPDF OCR page two. Quality test.';
const cases = [
  ['selectable', 'test/fixtures/selectable.pdf', expectedSelectable, { ocr: false }],
  ['scanned-ocr', 'test/fixtures/scanned.pdf', expectedOcr, {}],
];
const rows = [];
for (const [name, file, expected, options] of cases) {
  const result = await extractPdf(file, options);
  const actual = normalize(result.text.replace(/^## Page \d+/gm, ''));
  const target = normalize(expected);
  const distance = levenshtein(actual, target);
  rows.push({ name, method: result.method, expected_chars: target.length, actual_chars: actual.length, edit_distance: distance, quality_percent: Number((100 * Math.max(0, 1 - distance / Math.max(target.length, 1))).toFixed(2)), contains_all_expected_phrases: name === 'selectable' ? actual.includes(target) : ['nexusspdf ocr page one scanned text', 'nexusspdf ocr page two quality test'].every((x) => actual.includes(x)) });
}
console.log(JSON.stringify({ rows }, null, 2));
