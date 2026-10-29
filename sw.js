// Estudio Viral · hace que la app se pueda instalar y se actualice sola.
// Siempre busca la versión más nueva en internet. Si la señal es mala y tarda más de 4 segundos,
// abre la última versión guardada al toque (y la nueva queda lista para la próxima vez).
// Si no hay conexión, abre la última guardada.
const CACHE = 'estudio-viral';
const ESPERA = 4000;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const red = fetch(r, { cache: 'no-store' })
    .then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; });
  red.catch(() => {});
  const guardada = () => caches.match(r).then(m => m || caches.match('/'));
  e.respondWith(new Promise(resolve => {
    let listo = false;
    const t = setTimeout(() => {
      guardada().then(m => { if (!listo && m) { listo = true; resolve(m); } });
    }, ESPERA);
    red.then(res => { if (!listo) { listo = true; clearTimeout(t); resolve(res); } })
      .catch(() => guardada().then(m => {
        if (listo) return;
        listo = true; clearTimeout(t);
        resolve(m || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      }));
  }));
});
