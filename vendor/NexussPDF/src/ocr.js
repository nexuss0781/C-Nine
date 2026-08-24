import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * OCR an image-only PDF. The upstream plugin delegates this to Obsidian's
 * text-extractor/Tesseract plugin; this standalone adapter makes that boundary
 * explicit through pdftoppm + tesseract CLI tools.
 */
export async function ocrPdf(pdfPath, options = {}) {
  const dpi = String(options.dpi ?? 200);
  const language = options.language ?? 'eng';
  const work = await mkdtemp(join(tmpdir(), 'nexuss-pdf-'));
  try {
    await execFileAsync('pdftoppm', ['-r', dpi, '-png', pdfPath, join(work, 'page')], { maxBuffer: 1024 * 1024 });
    const files = (await readdir(work)).filter((f) => /^page-\d+\.png$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const parts = [];
    for (let i = 0; i < files.length; i += 1) {
      const image = join(work, files[i]);
      const { stdout } = await execFileAsync('tesseract', [image, 'stdout', '-l', language, '--psm', '3'], { maxBuffer: 20 * 1024 * 1024 });
      const text = stdout.replace(/\s+/g, ' ').trim();
      if (text) parts.push(`## Page ${i + 1}\n\n${text}`);
    }
    return { text: parts.join('\n\n') || '(OCR found no text.)', pageCount: files.length, dpi: Number(dpi), language };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function commandAvailable(command) {
  try { await execFileAsync('sh', ['-lc', `command -v ${command}`]); return true; }
  catch { return false; }
}
