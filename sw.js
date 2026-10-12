// Offline cache: the app works with no signal once it has been opened once.
// Pages: saved copy first (instant), refreshed in the background.
// Everything else: saved copy first, refreshed in the background.
const CACHE = 'uad-test-1e-1012-0245';  // TEST copy: only ever touches caches whose name starts with uad-test-
const FILES = ['./', './index.html', './sketch.html', './manifest.json', './icon-192.png', './icon-512.png', './pdf.min.mjs', './pdf.worker.min.mjs'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('uad-test-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keep = (req, res) => { if (res && res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; };
const cached = req => caches.match(req, { ignoreSearch: true });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Saved copy first so switching between the inspection and the sketch is instant, even with no signal.
    // A newer version is fetched in the background and is used the next time the page opens.
    e.respondWith(cached(new Request((() => { const u = new URL(req.url); u.search = ''; return u.href; })())).then(hit => {
      const u = new URL(req.url); u.search = ''; const plain = new Request(u.href);
      const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => keep(plain, res));
      if (hit) { net.catch(() => {}); return hit; }
      return net.catch(() => cached('./index.html').then(r => r || Response.error()));
    }));
    return;
  }
  e.respondWith(cached(req).then(hit => {
    const net = fetch(req).then(res => keep(req, res));
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => Response.error());
  }));
});
