// Offline cache: the app works with no signal once it has been opened once.
// App page: try the network for 3 seconds, then use the saved copy (so weak Wi-Fi never leaves a blank screen).
// Everything else: saved copy first, refreshed in the background.
const CACHE = 'uad-test-v1';  // TEST copy: only ever touches caches whose name starts with uad-test-
const FILES = ['./', './index.html', './sketch.html', './manifest.json', './icon-192.png', './icon-512.png', './pdf.min.mjs', './pdf.worker.min.mjs'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('uad-test-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keep = (req, res) => { if (res && res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; };
const cached = req => caches.match(req, { ignoreSearch: true });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(new Promise(resolve => {
      let done = false; const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const fallback = () => cached(req).then(r => r || cached('./index.html')).then(r => finish(r || Response.error()));
      const timer = setTimeout(fallback, 3000);
      fetch(req).then(res => { clearTimeout(timer); finish(keep(req, res)); }).catch(() => { clearTimeout(timer); fallback(); });
    }));
    return;
  }
  e.respondWith(cached(req).then(hit => {
    const net = fetch(req).then(res => keep(req, res));
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => Response.error());
  }));
});
