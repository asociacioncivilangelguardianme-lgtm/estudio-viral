// Estudio Viral · "Mi carpeta": guarda tus proyectos en tu propio Vercel (Vercel Blob).
// Todo llega CIFRADO desde el navegador con tu PIN: acá nunca se ve el PIN ni el contenido.
// Necesita conectar un "Blob store" al proyecto en Vercel (crea solo BLOB_READ_WRITE_TOKEN).
import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

export const config = { maxDuration: 60 };

const hits = new Map();
function sameSite(req) {
  const host = req.headers.host || '';
  const src = req.headers.origin || req.headers.referer || '';
  if (!src) return false;
  let h = '';
  try { h = new URL(src).host; } catch (e) { return false; }
  return h === host || h.startsWith('localhost') || h.startsWith('127.0.0.1');
}
function tooMany(req, max) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  const now = Date.now();
  const l = (hits.get(ip) || []).filter((t) => now - t < 60000);
  l.push(now); hits.set(ip, l);
  if (hits.size > 5000) hits.clear();
  return l.length > max;
}
// la carpeta sale del PIN (ya convertido en el navegador) + un secreto del servidor
function folder(h) {
  const sec = process.env.CLOUD_SECRET || process.env.BLOB_READ_WRITE_TOKEN || '';
  return crypto.createHash('sha256').update(sec + '|' + h).digest('hex').slice(0, 40);
}
async function rawBody(req) {
  try { const b = req.body; if (Buffer.isBuffer(b)) return b; if (b instanceof Uint8Array) return Buffer.from(b); } catch (e) {}
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 4.6e6) throw new Error('too big'); chunks.push(c); }
  return Buffer.concat(chunks);
}
async function listAll(prefix) {
  const out = []; let cursor;
  do { const r = await list({ prefix, limit: 1000, cursor }); out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return out;
}

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'nostore' });
    if (!sameSite(req)) return res.status(403).json({ error: 'forbidden' });
    if (tooMany(req, 150)) return res.status(429).json({ error: 'Demasiados pedidos. Esperá un minuto.' });
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const op = String(q.op || ''), h = String(q.h || ''), n = String(q.n || '');
    if (!/^[a-f0-9]{64}$/.test(h)) return res.status(400).json({ error: 'bad key' });
    if (n && !/^[\w.\-]{1,90}$/.test(n)) return res.status(400).json({ error: 'bad name' });
    const base = 'ev/' + folder(h) + '/';

    if (op === 'list') {
      const blobs = await listAll(base);
      return res.status(200).json({ files: blobs.map((b) => ({ n: b.pathname.slice(base.length), url: b.url, size: b.size, at: b.uploadedAt })) });
    }
    if (op === 'put' && req.method === 'POST') {
      if (!n) return res.status(400).json({ error: 'name' });
      const body = await rawBody(req);
      const r = await put(base + n, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream', cacheControlMaxAge: 60 });
      return res.status(200).json({ ok: true, url: r.url, size: body.length });
    }
    if (op === 'get') {
      const b = (await list({ prefix: base + n, limit: 5 })).blobs.find((x) => x.pathname === base + n);
      if (!b) return res.status(404).json({ error: 'not found' });
      const r = await fetch(b.url + '?t=' + Date.now());
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(buf);
    }
    if (op === 'del' && req.method === 'POST') {
      if (!n) return res.status(400).json({ error: 'name' });
      const blobs = (await listAll(base + n));
      if (blobs.length) await del(blobs.map((b) => b.url));
      return res.status(200).json({ ok: true, deleted: blobs.length });
    }
    return res.status(400).json({ error: 'op' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e).slice(0, 200) });
  }
}
