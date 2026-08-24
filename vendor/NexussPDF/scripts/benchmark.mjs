import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { extractPdf } from '../src/index.js';

const cases = [
  ['selectable', 'test/fixtures/selectable.pdf'],
  ['scanned-ocr', 'test/fixtures/scanned.pdf'],
];
const rows = [];
for (const [name, file] of cases) {
  const data = await readFile(file);
  const runs = 3;
  const times = [];
  let result;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    result = await extractPdf(file, { dpi: 200 });
    times.push(performance.now() - start);
  }
  const sorted = [...times].sort((a, b) => a - b);
  rows.push({ name, bytes: data.length, pages: result.metadata.pageCount, method: result.method, characters: result.text.length, min_ms: sorted[0], median_ms: sorted[1], max_ms: sorted[2], throughput_mb_s: (data.length / 1024 / 1024) / (sorted[1] / 1000) });
}
console.log(JSON.stringify({ generated_at: new Date().toISOString(), node: process.version, rows }, null, 2));
