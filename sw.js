const CACHE_NAME = 'visit-bridge-shell-v15';
const ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png',
  '/src/styles.css', '/src/app.js', '/src/visit.js', '/src/cards.js', '/src/storage.js', '/src/offline.js', '/src/speech.js', '/src/model.js', '/src/model-worker.js', '/src/model-config.js', '/src/wording.js', '/src/playback.js', '/src/templates.js', '/src/language-packs.js', '/src/ar.js', '/src/ar-renderer.js'];
const RUNTIME = ['/vendor/transformers.min.js', '/vendor/ort-wasm-simd-threaded.jsep.mjs', '/vendor/ort-wasm-simd-threaded.jsep.wasm'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))));
  // Updates wait until existing app tabs close to avoid changing a running visit.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('visit-bridge-shell-') && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || (!ASSETS.includes(url.pathname) && !RUNTIME.includes(url.pathname) && url.pathname !== '/packs/es-return-visit-v1.json')) return;
  event.respondWith((async () => {
    if (url.pathname === '/packs/es-return-visit-v1.json' && event.request.cache === 'reload') return fetch(event.request);
    const cache = await caches.open(url.pathname === '/packs/es-return-visit-v1.json' ? 'visit-bridge-language-es-v1' : RUNTIME.includes(url.pathname) ? 'visit-bridge-model-smollm2-135m-v1' : CACHE_NAME);
    return (await cache.match(url.pathname)) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_SHELL' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.all(ASSETS.map(asset => cache.match(asset)));
    event.ports[0].postMessage({ type: 'SHELL_STATUS', ready: results.every(Boolean) });
  })());
});
