import { extractPdfBuffer } from '../src/index.js';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '4.5mb',
  },
};

const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        reject(Object.assign(new Error('PDF exceeds Vercel’s 4.5 MB request limit.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST with application/pdf as the request body.' });
  }
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (contentType && contentType !== 'application/pdf' && contentType !== 'application/octet-stream') {
    return res.status(415).json({ error: 'Content-Type must be application/pdf.' });
  }
  try {
    const body = await readBody(req);
    if (!body.length) return res.status(400).json({ error: 'Request body is empty.' });
    const result = await extractPdfBuffer(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
      runtime: 'vercel',
      ocr: req.query.ocr !== 'false',
      dpi: Number(req.query.dpi ?? 200),
      scale: Number(req.query.scale ?? 1.5),
      language: String(req.query.language ?? 'eng'),
      keepWorkerWarm: true,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode ?? 500;
    console.error('[NexussPDF] extraction failed:', error);
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
