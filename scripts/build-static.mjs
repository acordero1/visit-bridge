import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { PUBLIC_ASSETS } from './public-assets.mjs';
const root = new URL('../', import.meta.url), output = new URL('dist/', root);
// Only this generated output directory is replaced; source/vault/test data are excluded.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const asset of PUBLIC_ASSETS) {
  if (!/^\/[a-zA-Z0-9/_.-]+$/.test(asset) || asset.includes('..')) throw new Error('Invalid public asset path');
  const source = new URL(`.${asset}`, root), target = new URL(`.${asset}`, output);
  if (!(await stat(source)).isFile()) throw new Error(`Missing asset: ${asset}`);
  await mkdir(new URL('./', target), { recursive: true });
  await copyFile(source, target);
}
const worker = await readFile(new URL('sw.js', root), 'utf8');
const shell = worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1];
for (const asset of [...shell.matchAll(/'([^']+)'/g)].map(match => match[1]).filter(path => path !== '/')) {
  if (!PUBLIC_ASSETS.includes(asset)) throw new Error(`Shell asset excluded from build: ${asset}`);
}
await writeFile(new URL('_headers', output), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(self), microphone=(self), xr-spatial-tracking=(self)
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
/sw.js
  Cache-Control: no-store
/index.html
  Cache-Control: no-cache
/device-check.html
  Cache-Control: no-cache
`);
console.log(`Built ${PUBLIC_ASSETS.length} public files. Source, tests, vaults and work files are excluded.`);
