import { validPack } from './templates.js';
export const PACK_URL = '/packs/es-return-visit-v1.1.json';
export const PACK_CACHE = 'visit-bridge-language-es-v1.1';
export const PACK_SHA256 = '34ab7f8104a841e28224c273d2dc339a062d2d0390907fb5468b0fa966004a64';
async function verified(response) {
  if (!response?.ok) throw new Error('The Spanish demonstration pack is unavailable. Install it while connected.');
  const bytes = await response.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== PACK_SHA256) throw new Error('The Spanish pack integrity check failed. Install it again.');
  const pack = JSON.parse(new TextDecoder().decode(bytes));
  if (!validPack(pack)) throw new Error('The Spanish pack is incomplete or unsupported.');
  return { pack, bytes };
}
export async function loadLanguagePack() {
  const cache = await caches.open(PACK_CACHE);
  const response = await cache.match(PACK_URL);
  if (!response) return null;
  return (await verified(response)).pack;
}
export async function installLanguagePack() {
  const response = await fetch(PACK_URL, { cache: 'reload', credentials: 'omit' });
  const { pack, bytes } = await verified(response);
  const cache = await caches.open(PACK_CACHE);
  await cache.put(PACK_URL, new Response(bytes, { headers: { 'Content-Type': 'application/json' } }));
  return pack;
}
