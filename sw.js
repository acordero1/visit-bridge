const CACHE_NAME = 'visit-bridge-shell-v32';
const ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png',
  '/src/styles.css', '/src/app.js', '/src/visit.js', '/src/cards.js', '/src/storage.js', '/src/vault-crypto.js', '/src/consent.js', '/src/session.js', '/src/offline.js', '/src/speech.js', '/src/model.js', '/src/model-worker.js', '/src/model-config.js', '/src/wording.js', '/src/handoff.js', '/src/understanding.js', '/src/playback.js', '/src/templates.js', '/src/language-packs.js', '/src/ar.js', '/src/ar-renderer.js', '/src/portable-card.js', '/src/model-pack-manifest.js', '/src/sha256.js', '/src/model-pack.js', '/src/pack-worker.js', '/src/pack-controller.js', '/vendor/transformers-LICENSE.txt', '/vendor/onnxruntime-LICENSE.txt', '/vendor/PROVENANCE.json', '/vendor/model-LICENSE.txt', '/vendor/model-PROVENANCE.json'];
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
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || (!ASSETS.includes(url.pathname) && !RUNTIME.includes(url.pathname) && !['/packs/es-return-visit-v1.json','/packs/es-return-visit-v1.1.json'].includes(url.pathname))) return;
  event.respondWith((async () => {
    if (url.pathname.startsWith('/packs/es-return-visit-') && event.request.cache === 'reload') return fetch(event.request);
    let name=CACHE_NAME;
    if(url.pathname.startsWith('/packs/es-return-visit-'))name=url.pathname.endsWith('v1.1.json')?'visit-bridge-language-es-v1.1':'visit-bridge-language-es-v1';
    else if(RUNTIME.includes(url.pathname)) {
      const selector=await caches.open('visit-bridge-model-selection-v1'),response=await selector.match('/models/visit-bridge-active-pack-v1'),chosen=response?await response.text():'';
      name=/^visit-bridge-model-pack-v1-[a-f0-9-]{36}$/.test(chosen)?chosen:'visit-bridge-model-smollm2-135m-v1';
    }
    const cache=await caches.open(name);
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
