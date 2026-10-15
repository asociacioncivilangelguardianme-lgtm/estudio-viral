// Protección básica para que nadie use tu servidor (y tu cupo gratis de Gemini) desde otro lado.
// 1) Solo acepta pedidos que vienen de tu propia página.
// 2) Límite de pedidos por minuto por persona.
const hits = new Map();

function sameSite(req) {
  const host = req.headers.host || '';
  const src = req.headers.origin || req.headers.referer || '';
  if (!src) return false; // sin origen = alguien llamando "por afuera"
  let h = '';
  try { h = new URL(src).host; } catch (e) { return false; }
  return h === host || h.startsWith('localhost') || h.startsWith('127.0.0.1');
}

function tooMany(req, max = 40, windowMs = 60000) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

module.exports = { sameSite, tooMany };
