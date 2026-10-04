import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const allowed = new Set(['/index.html', '/favicon.svg', '/manifest.webmanifest', '/sw.js', '/packs/es-return-visit-v1.json', '/icons/icon-192.png', '/icons/icon-512.png',
  '/src/app.js', '/src/visit.js', '/src/styles.css', '/src/cards.js', '/src/storage.js', '/src/offline.js', '/src/speech.js', '/src/model.js', '/src/model-worker.js', '/src/model-config.js', '/src/wording.js', '/src/playback.js', '/src/templates.js', '/src/language-packs.js', '/src/ar.js', '/src/ar-renderer.js',
  '/vendor/transformers.min.js', '/vendor/ort-wasm-simd-threaded.jsep.mjs', '/vendor/ort-wasm-simd-threaded.jsep.wasm']);
http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const target = path === '/' ? '/index.html' : path;
  if (!allowed.has(target) || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  try {
    const data = await readFile(fileURLToPath(new URL(`.${target}`, root)));
    const extension = target.slice(target.lastIndexOf('.'));
    response.writeHead(200, { 'Content-Type': types[extension], 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Permissions-Policy': 'xr-spatial-tracking=(self)', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(500); response.end('Unable to load application file'); }
}).listen(port, host, () => console.log(`Visit Bridge is running at http://${host}:${port}`));
