import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,randomBytes } from 'node:crypto';
import { SHA256 } from '../src/sha256.js';
import { parsePack,makeHeader,verifiedResponse,cacheKey,importPack,exportPack } from '../src/model-pack.js';
import { PACK_MANIFEST } from '../src/model-pack-manifest.js';
import { createPackController } from '../src/pack-controller.js';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('incremental hashes match the standard implementation for padding boundaries, random chunking and large files',()=>{
 for(const size of [0,1,55,56,63,64,65,127,128,129,1000000]) {
  const bytes=randomBytes(size),hash=new SHA256();for(let i=0;i<bytes.length;i+=13)hash.update(bytes.subarray(i,i+13));assert.equal(hash.hex(),digest(bytes));
 }
});
test('model pack header is strict and refuses foreign revisions, traversal, duplicates, truncation and appended bytes',async()=>{
 const bytes=new Uint8Array([1,2,3]),manifest={format:1,model:'test',revision:'pinned',files:[{path:'models/test',size:3,sha256:digest(bytes),mime:'application/octet-stream'}]},blob=new Blob([...makeHeader(manifest),bytes]);
 assert.equal((await parsePack(blob,manifest))[0].size,3);
 for(const bad of [{...manifest,revision:'wrong'},{...manifest,files:[...manifest.files,...manifest.files]},{...manifest,files:[{...manifest.files[0],path:'../escape'}]}])await assert.rejects(parsePack(new Blob([...makeHeader(bad),bytes]),manifest));
 await assert.rejects(parsePack(blob.slice(0,blob.size-1),manifest));await assert.rejects(parsePack(new Blob([blob,'x']),manifest));await assert.rejects(parsePack(new Blob(['not a pack']),manifest));
});
test('streamed verification checks actual byte size, digest and cancellation before exposing a file as verified',async()=>{
 const bytes=new Uint8Array([1,2,3]),file={path:'test',size:3,sha256:digest(bytes),mime:'application/octet-stream'};
 assert.equal(await verifiedResponse(new Response(bytes),file).text(),'\u0001\u0002\u0003');
 for(const entry of [{...file,size:2},{...file,size:4},{...file,sha256:'0'.repeat(64)}])await assert.rejects(verifiedResponse(new Response(bytes),entry).arrayBuffer());
 await assert.rejects(verifiedResponse(new Response(bytes),file,()=>{},()=>{throw new Error('cancelled');}).arrayBuffer(),/cancelled/);
});
test('every release descriptor is unique, pinned and maps to a public asset path',()=>{
 assert.equal(new Set(PACK_MANIFEST.files.map(f=>f.path)).size,PACK_MANIFEST.files.length);
 for(const f of PACK_MANIFEST.files){assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.ok(f.size>0);assert.match(cacheKey(f),/^\/(models|vendor)\//);assert.equal(f.path.includes('..'),false);}
 assert.ok(PACK_MANIFEST.files.some(f=>f.path==='licenses/model-LICENSE.txt'));
});
test('pack cancellation discards late export results and uses graceful worker cancellation',()=>{
 const workers=[],exports=[],states=[];class Worker{constructor(){workers.push(this);}postMessage(message){this.message=message;}}
 const c=createPackController({environment:{Worker},onState:s=>states.push(s),onExport:b=>exports.push(b),onInstalled(){}});
 c.export();const w=workers[0];c.cancel();assert.equal(w.message.type,'cancel');w.onmessage({data:{type:'done',action:'export',result:new Blob(['late'])}});assert.equal(exports.length,0);assert.equal(c.isBusy(),false);
});
test('a checksum failure in staging cannot replace the previous cache or selection',async()=>{
 const {MODEL_CACHE,MODEL_MARKER,MODEL_REVISION,MODEL_KEYS,MODEL_STAGE_PREFIX,MODEL_SELECTION_CACHE,MODEL_SELECTION_KEY}=await import('../src/model-config.js');
 const original=globalThis.caches,stores=new Map();
 globalThis.caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async match(key){return data.get(key)?.clone();},async put(key,response){data.set(key,new Response(await response.arrayBuffer(),{headers:response.headers}));}};},async delete(name){return stores.delete(name);}};
 try {
  const old=await caches.open(MODEL_CACHE);await old.put(MODEL_MARKER,new Response(MODEL_REVISION));for(const key of MODEL_KEYS)await old.put(key,new Response('previous cached file'));
  const before=[...stores.get(MODEL_CACHE).keys()];
  const header=new Blob(makeHeader()),backing=new Blob([header,new Uint8Array(PACK_MANIFEST.files[0].size)]);
  const fake={size:header.size+PACK_MANIFEST.files.reduce((n,f)=>n+f.size,0),slice:(start,end)=>backing.slice(start,end)};
  await assert.rejects(importPack(fake),/Integrity check failed/);
  assert.deepEqual([...stores.get(MODEL_CACHE).keys()],before);assert.equal(await (await old.match(MODEL_MARKER)).text(),MODEL_REVISION);
  assert.equal([...stores.keys()].some(name=>name.startsWith(MODEL_STAGE_PREFIX)),false);assert.equal(stores.get(MODEL_SELECTION_CACHE)?.has(MODEL_SELECTION_KEY),false);
 }finally{globalThis.caches=original;}
});
