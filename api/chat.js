// Texto con IA para Estudio Viral (guiones, storyboard, asistente) usando Gemini de Google, gratis.
// La clave NO va en la página: se guarda en Vercel como variable de entorno llamada GEMINI_API_KEY.
//   POST /api/chat  { "messages": [...], "temperature": 0.8 }  ->  { "ok": true, "content": "..." }

const { sameSite, tooMany } = require('./_guard');
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

  if (req.method === 'GET') {
    return send(200, { ok: true, configured: !!findKey() });
  }
  if (req.method !== 'POST') return send(405, { ok: false, error: 'Usá POST' });

  // Solo tu propia página puede usar este servidor (así nadie gasta tu cupo gratis desde otro sitio)
  if (!sameSite(req)) return send(403, { ok: false, error: 'Origen no permitido' });
  if (tooMany(req, 40)) return send(429, { ok: false, code: 'LIMIT', error: 'Demasiados pedidos seguidos. Esperá un minuto.' });

  const key = findKey();
  if (!key) return send(503, { ok: false, code: 'NO_KEY', error: 'Falta configurar la clave de Gemini en Vercel (GEMINI_API_KEY).' });

  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch (e) { body = null; }
  if (!body || typeof body !== 'object') body = await readJson(req).catch(() => null);
  if (!body || !Array.isArray(body.messages) || !body.messages.length) return send(400, { ok: false, error: 'Faltan los mensajes' });
  if (JSON.stringify(body.messages).length > 3000000) return send(413, { ok: false, error: 'Mensaje demasiado grande' });

  const temperature = Math.max(0, Math.min(1.5, Number(body.temperature) || 0.8));
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const r = await fetch(URL_GEMINI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, messages: body.messages, temperature }),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (!r.ok) {
        const msg = (j && (j.error && (j.error.message || j.error)) || (Array.isArray(j) && j[0] && j[0].error && j[0].error.message)) || txt.slice(0, 200);
        lastErr = `Gemini ${r.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
        if (r.status === 400 && /API key|API_KEY/i.test(lastErr)) return send(401, { ok: false, code: 'BAD_KEY', error: 'La clave de Gemini no es válida. Revisala en Vercel.' });
        if (r.status === 401 || r.status === 403) return send(401, { ok: false, code: 'BAD_KEY', error: 'La clave de Gemini no es válida o no tiene permiso.' });
        continue; // probar el siguiente modelo (404 modelo inexistente, 429 límite, 5xx)
      }
      const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (content && String(content).trim()) return send(200, { ok: true, content: String(content), model });
      lastErr = 'Gemini respondió vacío';
    } catch (e) { lastErr = e.message || String(e); }
  }
  const limit = /429/.test(lastErr);
  return send(limit ? 429 : 502, { ok: false, code: limit ? 'LIMIT' : 'FAIL', error: limit ? 'Se alcanzó el límite gratis de Gemini por ahora. Probá en unos minutos.' : lastErr });
};

// Acepta la clave aunque el nombre tenga espacios, minúsculas o un nombre parecido
function findKey() {
  const env = process.env;
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim()) return clean(env.GEMINI_API_KEY);
  for (const k of Object.keys(env)) {
    const n = k.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if ((n.includes('GEMINI') || n === 'GOOGLEAPIKEY' || n === 'GOOGLEGENERATIVEAIAPIKEY') && env[k] && env[k].trim()) return clean(env[k]);
  }
  return '';
}
function clean(v) { return String(v).trim().replace(/^["']|["']$/g, '').trim(); }

function readJson(req) {
  return new Promise((ok, ko) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 4000000) ko(new Error('grande')); });
    req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { ko(e); } });
    req.on('error', ko);
  });
}
