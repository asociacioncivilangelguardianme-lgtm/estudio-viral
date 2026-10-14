// Voz gratis para Estudio Viral: usa las voces naturales de Microsoft Edge ("Leer en voz alta").
// No necesita clave. Se llama desde la página así:
//   POST /api/tts   { "text": "Hola", "voice": "es-AR-TomasNeural", "rate": 0, "pitch": 0 }
// Devuelve un MP3.
// Aviso: es un servicio no oficial de Microsoft; si algún día deja de responder,
// la página usa automáticamente la voz Piper (que corre en el navegador).

const WebSocket = require('ws');
const { edgeHeaders, wssUrl, adjustSkew, newId } = require('./_edge');

const MAX_CHARS = 3000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  const fail = (code, msg) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ ok: false, error: msg })); };

  let p = {};
  try { p = await readParams(req); } catch (e) { return fail(400, 'Datos inválidos'); }

  const text = cleanText(String(p.text || '')).slice(0, MAX_CHARS).trim();
  const voice = String(p.voice || 'es-AR-TomasNeural');
  const rate = clampInt(p.rate, -50, 100);
  const pitch = clampInt(p.pitch, -50, 50);

  if (!text) return fail(400, 'Falta el texto');
  if (!/^[a-z]{2,3}-[A-Za-z]{2,4}(-[A-Za-z]+)?-[A-Za-z]+Neural$/.test(voice)) return fail(400, 'Voz inválida');

  try {
    let audio;
    try { audio = await synth({ text, voice, rate, pitch }); }
    catch (e) {
      // Si el reloj del servidor no coincide con el de Microsoft, se corrige y se reintenta una vez
      if (e.retry) audio = await synth({ text, voice, rate, pitch });
      else throw e;
    }
    if (!audio || audio.length < 200) return fail(502, 'Microsoft no devolvió audio');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    fail(502, 'No se pudo generar la voz: ' + (e.message || e));
  }
};

function synth({ text, voice, rate, pitch }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); try { ws.terminate(); } catch (e) {} err ? reject(err) : resolve(val); };
    const ws = new WebSocket(wssUrl(), { headers: edgeHeaders(), origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold', perMessageDeflate: true });
    const timer = setTimeout(() => finish(new Error('tiempo agotado')), 25000);

    ws.on('unexpected-response', (req, resp) => {
      const err = new Error('Microsoft respondió ' + resp.statusCode);
      if (resp.statusCode === 403 && adjustSkew(resp.headers && resp.headers.date)) err.retry = true;
      finish(err);
    });
    ws.on('error', (e) => finish(e));
    ws.on('close', () => { if (!done) chunks.length ? finish(null, Buffer.concat(chunks)) : finish(new Error('conexión cerrada')); });

    ws.on('open', () => {
      const ts = dateStr();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
      );
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody pitch='${sign(pitch)}Hz' rate='${sign(rate)}%' volume='+0%'>${xmlEscape(text)}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${newId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n${ssml}`);
    });

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        const s = data.toString();
        if (s.includes('Path:turn.end')) finish(null, Buffer.concat(chunks));
        return;
      }
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (buf.length < 2) return;
      const hl = buf.readUInt16BE(0);
      if (hl + 2 > buf.length) return;
      const head = buf.subarray(2, 2 + hl).toString();
      if (!/Path:audio/.test(head)) return;
      const audio = buf.subarray(2 + hl);
      if (audio.length) chunks.push(audio);
    });
  });
}

async function readParams(req) {
  if (req.method === 'GET') {
    if (req.query) return req.query;
    return Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  }
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const raw = await new Promise((ok, ko) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 200000) ko(new Error('grande')); }); req.on('end', () => ok(d)); req.on('error', ko); });
  return JSON.parse(raw || '{}');
}

function cleanText(t) { return t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').replace(/\s+/g, ' '); }
function xmlEscape(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clampInt(v, a, b) { const n = Math.round(Number(v) || 0); return Math.max(a, Math.min(b, n)); }
function sign(n) { return (n >= 0 ? '+' : '') + n; }
function dateStr() {
  const d = new Date();
  const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  const p = (n) => String(n).padStart(2, '0');
  return `${D} ${M} ${p(d.getUTCDate())} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

module.exports._test = { synth, dateStr, xmlEscape, cleanText };
