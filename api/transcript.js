// Servidor gratis de Vercel: lee la transcripción de YouTube o la descripción de TikTok.
// Se usa así: /api/transcript?url=LINK_DEL_VIDEO

const UA_DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  let url = '';
  try { url = (req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url') || ''; } catch (e) {}
  if (!url) return send(400, { ok: false, error: 'Falta la URL del video.' });
  try {
    if (/tiktok\.com/i.test(url)) return send(200, await tiktok(url));
    const id = ytId(url);
    if (!id) return send(400, { ok: false, error: 'No reconozco ese link. Usá un link de YouTube o TikTok.' });
    return send(200, await youtube(id));
  } catch (e) {
    return send(200, { ok: false, error: 'Error leyendo el video: ' + (e.message || e) });
  }
};

function ytId(u) {
  const m = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function parseCaptions(xml) {
  const parts = [];
  const re = /<(text|p)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(xml))) parts.push(decodeEntities(m[2].replace(/<[^>]+>/g, '')));
  if (!parts.length && xml.trim().startsWith('{')) {
    try { const j = JSON.parse(xml); (j.events || []).forEach(ev => (ev.segs || []).forEach(sg => parts.push(sg.utf8 || ''))); } catch (e) {}
  }
  return decodeEntities(parts.join(' ')).replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickTrack(tracks) {
  const pref = ['es', 'es-419', 'es-ES', 'en', 'pt'];
  for (const l of pref) { const t = tracks.find(t => t.languageCode === l && t.kind !== 'asr') || tracks.find(t => t.languageCode === l); if (t) return t; }
  return tracks.find(t => /^es/.test(t.languageCode)) || tracks[0];
}

function extractArray(str, key) {
  const i = str.indexOf(key); if (i < 0) return null;
  let s = str.indexOf('[', i), depth = 0;
  for (let k = s; k < str.length; k++) {
    if (str[k] === '[') depth++; else if (str[k] === ']') { depth--; if (!depth) { try { return JSON.parse(str.slice(s, k + 1)); } catch (e) { return null; } } }
  }
  return null;
}

async function youtube(id) {
  let tracks = null, title = '', description = '';
  // 1) API interna de la app de Android (suele funcionar mejor desde servidores)
  try {
    const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip' },
      body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'es' } }, videoId: id })
    });
    const j = await r.json();
    tracks = j?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    title = j?.videoDetails?.title || '';
    description = j?.videoDetails?.shortDescription || '';
  } catch (e) {}
  // 2) Página web del video
  if (!tracks || !tracks.length) {
    try {
      const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=es`, { headers: { 'User-Agent': UA_DESK, 'Accept-Language': 'es-ES,es;q=0.9' } });
      const html = await r.text();
      tracks = extractArray(html, '"captionTracks":') || tracks;
      if (!title) { const t = html.match(/<meta name="title" content="([^"]*)"/); title = t ? decodeEntities(t[1]) : ''; }
      if (!description) { const d = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/); if (d) { try { description = JSON.parse('"' + d[1] + '"'); } catch (e) {} } }
    } catch (e) {}
  }
  if (tracks && tracks.length) {
    const t = pickTrack(tracks);
    let base = (t.baseUrl || '').replace(/\\u0026/g, '&').replace(/&fmt=[^&]*/, '');
    for (const fmt of ['', '&fmt=json3']) {
      try {
        const r = await fetch(base + fmt, { headers: { 'User-Agent': UA_DESK } });
        const text = parseCaptions(await r.text());
        if (text.length > 20) return { ok: true, source: 'youtube', title, text, lang: t.languageCode };
      } catch (e) {}
    }
  }
  if (description && description.length > 40) {
    return { ok: true, source: 'youtube', title, text: (title ? title + '. ' : '') + description, partial: true,
      note: 'Este video no tiene subtítulos accesibles: se usó el título y la descripción. Podés pegar el texto a mano.' };
  }
  return { ok: false, title, error: 'Este video no tiene subtítulos disponibles. Pegá el texto a mano en "Transcripción original".' };
}

async function tiktok(url) {
  const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), { headers: { 'User-Agent': UA_DESK } });
  if (!r.ok) return { ok: false, error: 'No se pudo leer el TikTok (¿es público?). Pegá el texto a mano.' };
  const j = await r.json();
  const text = (j.title || '').trim();
  if (!text) return { ok: false, error: 'El TikTok no tiene descripción. Pegá lo que dice el video a mano.' };
  return { ok: true, source: 'tiktok', title: (j.author_name ? '@' + j.author_name + ' — ' : '') + text.slice(0, 50), text, partial: true,
    note: 'TikTok solo comparte la descripción: la IA va a desarrollar un guion completo sobre ese tema.' };
}
