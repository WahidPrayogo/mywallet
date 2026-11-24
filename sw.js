// Service worker Wallet: cangkang aplikasi tersedia offline, data selalu dari jaringan.
const V = 'wallet-v1';
const SHELL = ['index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Jaringan dulu; kalau gagal pakai salinan terakhir.
const networkFirst = (req, key) =>
  fetch(req)
    .then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(key || req, copy)); }
      return res;
    })
    .catch(() => caches.match(key || req));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Data dan login Supabase tidak pernah disimpan di cache.
  if (/\.supabase\.(co|in)$/.test(url.hostname)) return;
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, 'index.html')); return; }
  if (url.origin === self.location.origin && url.pathname.endsWith('/config.js')) { e.respondWith(networkFirst(req)); return; }
  // Sisanya (ikon, font, pustaka CDN): pakai cache, perbarui di belakang layar.
  e.respondWith(
    caches.open(V).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
