// Lista completa de voces gratis de Microsoft Edge (cientos, en muchos idiomas).
// La página la usa para el botón "Ver todas las voces".
const { voicesUrl, edgeHeaders, adjustSkew } = require('./_edge');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    let r = await get();
    if (r.status === 403 && adjustSkew(r.headers.get('date'))) r = await get();
    if (!r.ok) throw new Error('Microsoft respondió ' + r.status);
    const list = await r.json();
    const out = list.map((v) => ({ id: v.ShortName, g: v.Gender === 'Female' ? 'F' : 'M', loc: v.Locale }));
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, voices: out }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: e.message || String(e) }));
  }
};

function get() {
  const h = edgeHeaders();
  delete h['Pragma']; delete h['Cache-Control'];
  h['Authority'] = 'speech.platform.bing.com';
  h['Accept'] = '*/*';
  h['Sec-CH-UA'] = '" Not;A Brand";v="99", "Microsoft Edge";v="143", "Chromium";v="143"';
  h['Sec-CH-UA-Mobile'] = '?0';
  return fetch(voicesUrl(), { headers: h });
}
