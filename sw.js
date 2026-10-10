/* MindBalance - service worker: deixa o app abrir sem internet.
   Ao publicar uma versão nova, mude o número em CACHE. */
const CACHE = 'mindbalance-v2.0.0';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/content.js', './js/storage.js', './js/app.js',
  './manifest.webmanifest', './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Mostra o que já está salvo e atualiza em segundo plano. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
        return res;
      }).catch(() => hit || (r.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('./#/checkin');
  }));
});
