// Datos compartidos para hablar con el servicio de voz de Microsoft Edge.
// (Los archivos que empiezan con "_" no se publican como dirección de la API en Vercel.)
const crypto = require('crypto');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL = '143.0.3650.75';
const CHROMIUM_MAJOR = '143';
const BASE = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`;

let skew = 0; // diferencia de reloj con Microsoft, en segundos

function secMsGec() {
  let s = Math.floor(Date.now() / 1000 + skew) + 11644473600; // segundos desde 1601 (hora de Windows)
  s -= s % 300;                                                // redondeo a 5 minutos
  const ticks = BigInt(s) * 10000000n;                          // en unidades de 100 nanosegundos
  return crypto.createHash('sha256').update(ticks.toString() + TRUSTED_CLIENT_TOKEN, 'ascii').digest('hex').toUpperCase();
}

function newId() { return crypto.randomUUID().replace(/-/g, ''); }

function wssUrl() {
  return `wss://${BASE}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${newId()}` +
    `&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL}`;
}

function voicesUrl() {
  return `https://${BASE}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL}`;
}

function edgeHeaders() {
  return {
    'User-Agent': UA,
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
    'Cookie': `muid=${crypto.randomBytes(16).toString('hex').toUpperCase()};`,
  };
}

// Corrige el reloj usando la fecha que manda Microsoft. Devuelve true si cambió algo.
function adjustSkew(dateHeader) {
  const t = Date.parse(dateHeader || '');
  if (!t) return false;
  const diff = t / 1000 - Date.now() / 1000;
  if (Math.abs(diff - skew) < 5) return false;
  skew = diff;
  return true;
}

module.exports = { secMsGec, newId, wssUrl, voicesUrl, edgeHeaders, adjustSkew, UA };
