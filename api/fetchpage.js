// Estudio Viral · Constructor: lee una página PÚBLICA y saca su estructura
// (títulos, menús, botones, formularios, colores, letras y textos) para que la IA
// arme una versión propia. No copia código ni entra a páginas privadas o con contraseña.
// Se usa así: /api/fetchpage?url=https://ejemplo.com

const dns = require('dns').promises;
const net = require('net');
const { sameSite, tooMany } = require('./_guard');

const MAX_BYTES = 1500000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Direcciones internas o privadas: nunca se leen (protege tu servidor)
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return privateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80');
}

async function safeUrl(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch (e) { throw new Error('Ese link no es válido.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Solo se pueden leer links que empiezan con http o https.');
  if (u.username || u.password) throw new Error('Ese link tiene usuario o contraseña: no se puede leer.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('Esa dirección es privada.');
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (!ips.length || ips.some(privateIp)) throw new Error('Esa dirección es privada.');
  return u;
}

async function getPage(url) {
  let u = await safeUrl(url);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'es-AR,es;q=0.9' }, signal: AbortSignal.timeout(12000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = await safeUrl(new URL(r.headers.get('location'), u).href); continue; }
    if (r.status === 401 || r.status === 403) throw new Error('Esa página no deja que la lean (pide permiso o bloquea robots). Probá con una captura de pantalla.');
    if (!r.ok) throw new Error('La página respondió con error ' + r.status + '.');
    const ct = r.headers.get('content-type') || '';
    if (!/html|xml|text/i.test(ct)) throw new Error('Ese link no es una página web (es ' + (ct.split(';')[0] || 'otro tipo de archivo') + ').');
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; n += value.length; chunks.push(value); if (n > MAX_BYTES) { try { reader.cancel(); } catch (e) {} break; } }
    return { html: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8'), finalUrl: u.href };
  }
  throw new Error('La página redirige demasiadas veces.');
}

const dec = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
const clean = (s) => dec(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const uniq = (a, max) => [...new Set(a.filter(Boolean))].slice(0, max);
function all(html, re, fn) { const out = []; let m; re.lastIndex = 0; while ((m = re.exec(html)) && out.length < 400) out.push(fn(m)); return out; }
const attr = (tag, name) => { const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return m ? dec(m[2] ?? m[3] ?? m[4] ?? '') : ''; };

function analyze(html, finalUrl) {
  const styleText = all(html, /<style[^>]*>([\s\S]*?)<\/style>/gi, (m) => m[1]).join('\n') + '\n' + all(html, /style\s*=\s*"([^"]*)"/gi, (m) => m[1]).join(';');
  const body = html.replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const colorCount = {};
  all(styleText, /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, (m) => m[0].toLowerCase()).forEach((c) => { colorCount[c] = (colorCount[c] || 0) + 1; });
  all(styleText, /rgba?\([^)]+\)/gi, (m) => m[0].replace(/\s+/g, '')).forEach((c) => { colorCount[c] = (colorCount[c] || 0) + 1; });
  const colors = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map((e) => e[0]);
  const fonts = uniq(all(styleText, /font-family\s*:\s*([^;}{]+)/gi, (m) => m[1].split(',')[0].replace(/["']/g, '').trim()), 6)
    .concat(uniq(all(html, /fonts\.googleapis\.com\/css2?\?family=([^"&']+)/gi, (m) => decodeURIComponent(m[1]).split(':')[0].replace(/\+/g, ' ')), 4));
  const headings = all(body, /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi, (m) => m[1].toUpperCase() + ': ' + clean(m[2])).filter((t) => t.length > 4);
  const navLinks = uniq(all((body.match(/<nav\b[\s\S]*?<\/nav>/gi) || []).join(' '), /<a\b[^>]*>([\s\S]*?)<\/a>/gi, (m) => clean(m[1])), 25);
  const buttons = uniq(all(body, /<button\b[^>]*>([\s\S]*?)<\/button>/gi, (m) => clean(m[1])).concat(all(body, /<a\b[^>]*class="[^"]*(btn|button|cta)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, (m) => clean(m[2]))), 30);
  const inputs = uniq(all(body, /<(input|textarea|select)\b[^>]*>/gi, (m) => { const t = attr(m[0], 'type') || m[1].toLowerCase(); const l = attr(m[0], 'placeholder') || attr(m[0], 'aria-label') || attr(m[0], 'name'); return t === 'hidden' ? '' : (t + (l ? ' «' + l + '»' : '')); }), 25);
  const forms = (body.match(/<form\b/gi) || []).length;
  const sections = uniq(all(body, /<(section|header|footer|aside|main|article)\b[^>]*>/gi, (m) => m[1].toLowerCase() + (attr(m[0], 'id') ? '#' + attr(m[0], 'id') : '') + (attr(m[0], 'class') ? '.' + attr(m[0], 'class').split(/\s+/)[0] : '')), 30);
  const imgs = all(body, /<img\b[^>]*>/gi, (m) => attr(m[0], 'alt')).filter(Boolean);
  const paragraphs = all(body, /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m) => clean(m[2])).filter((t) => t.length > 25);
  let text = paragraphs.join('\n'); if (text.length > 3500) text = text.slice(0, 3500) + '…';
  const title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [''])[0];
  return {
    url: finalUrl, title, description: attr(description, 'content'),
    lang: attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang'),
    colors, fonts: uniq(fonts, 6), sections, headings: headings.slice(0, 40), navLinks, buttons, inputs, forms,
    images: { count: (body.match(/<img\b/gi) || []).length, alts: uniq(imgs, 15) },
    usesFramework: /__NEXT_DATA__|data-reactroot|ng-version|data-v-|__nuxt/i.test(html),
    littleText: paragraphs.length < 2 && headings.length < 2,
    text,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  if (!sameSite(req)) return send(403, { ok: false, error: 'Origen no permitido' });
  if (tooMany(req, 20)) return send(429, { ok: false, error: 'Demasiados pedidos seguidos. Esperá un minuto.' });
  let url = '';
  try { url = (req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url') || ''; } catch (e) {}
  if (!url) return send(400, { ok: false, error: 'Falta el link.' });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const { html, finalUrl } = await getPage(url);
    return send(200, { ok: true, page: analyze(html, finalUrl) });
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'La página tardó demasiado en responder.' : (e.code === 'ENOTFOUND' ? 'No existe esa página (revisá el link).' : (e.message || String(e)));
    return send(200, { ok: false, error: msg });
  }
};
