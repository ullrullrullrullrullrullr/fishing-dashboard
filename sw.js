const CACHE = 'fishing-dashboard-v3';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './src/app.js',
  './src/checklist.js',
  './src/config.js',
  './src/dates.js',
  './src/fish-cards.js',
  './src/format.js',
  './src/freshness.js',
  './src/gauges.js',
  './src/http.js',
  './src/judge.js',
  './src/refresh-plan.js',
  './src/spots.js',
  './src/store.js',
  './src/sun.js',
  './src/tide.js',
  './src/ui.js',
  './src/validate.js',
  './src/view-model.js',
  './src/weather.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 画面のファイルは「キャッシュ優先+裏で更新」。電波が弱くてもすぐ開き、次に開いたときに新しくなる。
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
        }
        return res;
      });
      if (hit) {
        event.waitUntil(network.catch(() => {}));
        return hit;
      }
      return network.catch(() =>
        req.mode === 'navigate' ? caches.match('./index.html') : Response.error(),
      );
    }),
  );
});
