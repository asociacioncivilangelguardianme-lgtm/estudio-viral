// Estudio Viral · conexión con Gemini (gratis). La clave queda escondida en Vercel (GEMINI_API_KEY).
// Si un modelo deja de existir o se le acaba el cupo, prueba solo con el siguiente.
export const config = { maxDuration: 60 };

const MODELS = [
  process.env.GEMINI_MODEL,          // opcional: para forzar uno desde Vercel
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash',
].filter(Boolean);

function toParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content ?? '') }];
  const parts = [];
  for (const c of content) {
    if (!c) continue;
    if (c.type === 'text') parts.push({ text: c.text || '' });
    else if (c.type === 'image_url') {
      const url = (c.image_url && (c.image_url.url || c.image_url)) || '';
      const m = String(url).match(/^data:([^;]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }
  return parts.length ? parts : [{ text: '' }];
}

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: !!key });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
  if (!key) return res.status(200).json({ ok: false, code: 'NO_KEY', error: 'Falta GEMINI_API_KEY en Vercel' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.8;

  const system = messages.filter(m => m.role === 'system').map(m => typeof m.content === 'string' ? m.content : toParts(m.content).map(p => p.text || '').join('\n')).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toParts(m.content) }));
  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hola' }] });

  const payload = { contents, generationConfig: { temperature } };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  let lastStatus = 0, lastMsg = '', sawLimit = false, badKey = false;
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (text) return res.status(200).json({ ok: true, content: text, model });
        lastMsg = 'Gemini respondió vacío (' + (j.candidates?.[0]?.finishReason || 'sin texto') + ')';
        continue;
      }
      lastStatus = r.status; lastMsg = j.error?.message || ('HTTP ' + r.status);
      if (r.status === 429) { sawLimit = true; continue; }               // cupo agotado: probar otro modelo
      if (r.status === 404) continue;                                      // modelo que ya no existe: probar otro
      if (r.status === 400 && /api key|API_KEY/i.test(lastMsg)) { badKey = true; break; }
      if (r.status === 401 || r.status === 403) { badKey = true; break; }
      if (r.status >= 500) continue;
      break;
    } catch (e) { lastMsg = e.message; }
  }
  if (badKey) return res.status(200).json({ ok: false, code: 'BAD_KEY', error: 'La clave de Gemini no es válida: revisala en Vercel (GEMINI_API_KEY)' });
  if (sawLimit) return res.status(200).json({ ok: false, code: 'LIMIT', error: 'Se terminó el cupo gratis de Gemini por ahora' });
  return res.status(200).json({ ok: false, error: 'Gemini ' + (lastStatus || '') + ': ' + lastMsg });
}
