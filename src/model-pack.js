import { SHA256 } from './sha256.js';
import { PACK_MANIFEST, PACK_BYTES } from './model-pack-manifest.js';
import { MODEL_MARKER, MODEL_REVISION, modelPath, activeModelCache, MODEL_SELECTION_CACHE, MODEL_SELECTION_KEY, MODEL_STAGE_PREFIX } from './model-config.js';
export const MAGIC = new TextEncoder().encode('VISITBRIDGE-MODEL-PACK\n');
const header=()=>new TextEncoder().encode(JSON.stringify(PACK_MANIFEST));
export const archiveSize=()=>MAGIC.length+4+header().length+PACK_BYTES;
export const cacheKey=file=>file.path.startsWith('models/')?modelPath(file.path.slice(7)):file.path.startsWith('licenses/')?`/vendor/${file.path.slice(9)}`:`/${file.path}`;
export function makeHeader(manifest=PACK_MANIFEST) {
  const bytes=new TextEncoder().encode(JSON.stringify(manifest)),length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,bytes.length,true);return [MAGIC,length,bytes];
}
export async function parsePack(file, expected=PACK_MANIFEST) {
  const prefix=new Uint8Array(await file.slice(0,MAGIC.length+4).arrayBuffer());
  if(prefix.length!==MAGIC.length+4||!MAGIC.every((byte,i)=>prefix[i]===byte))throw new Error('Choose a Visit Bridge .vbmodel pack.');
  const length=new DataView(prefix.buffer).getUint32(MAGIC.length,true);
  if(!length||length>65536||file.size<MAGIC.length+4+length)throw new Error('Invalid model-pack header.');
  let manifest;try{manifest=JSON.parse(await file.slice(MAGIC.length+4,MAGIC.length+4+length).text());}catch{throw new Error('The model-pack manifest is damaged.');}
  // Exact descriptor equality also refuses duplicates, extra fields, foreign paths and revisions.
  if(JSON.stringify(manifest)!==JSON.stringify(expected))throw new Error('This model pack does not match the supported release.');
  let offset=MAGIC.length+4+length;
  const entries=expected.files.map(fileInfo=>{const entry={...fileInfo,start:offset,end:offset+fileInfo.size};offset=entry.end;return entry;});
  if(file.size!==offset)throw new Error('The model pack is incomplete or contains unexpected extra bytes.');return entries;
}
export function verifiedResponse(response,file,onProgress=()=>{},check=()=>{}) {
  if(!response?.ok||!response.body)throw new Error(`File unavailable: ${file.path}`);
  const hash=new SHA256();let received=0;
  return new Response(response.body.pipeThrough(new TransformStream({
    transform(chunk,controller){check();received+=chunk.length;if(received>file.size)throw new Error(`File is too large: ${file.path}`);hash.update(chunk);onProgress(received,file.size,file.path);controller.enqueue(chunk);},
    flush(){check();if(received!==file.size||hash.hex()!==file.sha256)throw new Error(`Integrity check failed: ${file.path}`);}
  })),{headers:{'Content-Type':file.mime}});
}
async function drain(response) { const reader=response.body.getReader();try{while(!(await reader.read()).done){/* Hashing happens in the stream. */}}finally{reader.releaseLock();} }
export async function verifyInstalled(onProgress=()=>{},check=()=>{}) {
  const name=await activeModelCache(),cache=await caches.open(name);check();
  if(await (await cache.match(MODEL_MARKER))?.text()!==MODEL_REVISION)return false;
  for(const file of PACK_MANIFEST.files) {
    let response=await cache.match(cacheKey(file));
    // Older installations lack public license files; fetch only same-origin shell assets.
    if(!response&&file.path.startsWith('licenses/'))response=await fetch(cacheKey(file));
    await drain(verifiedResponse(response,file,onProgress,check));
  }return true;
}
export async function cleanStaging(name) {
  if(name?.startsWith(MODEL_STAGE_PREFIX)&&name!==await activeModelCache())await caches.delete(name);
}
async function runInstallation(producer,{onProgress=()=>{},onStage=()=>{},check=()=>{},skipIfInstalled=false}={}) {
  let currentValid=false;try{currentValid=await verifyInstalled(onProgress,check);}catch{check();}
  if(currentValid&&skipIfInstalled)return {installed:true,reused:true};
  const name=currentValid?null:MODEL_STAGE_PREFIX+crypto.randomUUID();let cache=null,committed=false;
  try {
    if(name){onStage(name);cache=await caches.open(name);check();}
    for(const file of PACK_MANIFEST.files){check();const response=verifiedResponse(await producer(file),file,onProgress,check);if(cache)await cache.put(cacheKey(file),response);else await drain(response);}
    check();if(!cache)return {installed:true,reused:true};
    await cache.put(MODEL_MARKER,new Response(MODEL_REVISION));check();
    // One selector write makes the complete verified pack visible. Older active packs stay usable.
    const selector=await caches.open(MODEL_SELECTION_CACHE);check();await selector.put(MODEL_SELECTION_KEY,new Response(name));committed=true;
    return {installed:true,reused:false};
  } finally {if(name&&!committed)await cleanStaging(name);}
}
export async function importPack(file,options={}) {
  const entries=await parsePack(file);let index=0;
  return runInstallation(async()=>{const entry=entries[index++];return new Response(file.slice(entry.start,entry.end).stream());},options);
}
export async function installOnline(options={}) {
  return runInstallation(file=>fetch(file.path.startsWith('models/')?`https://huggingface.co/${PACK_MANIFEST.model}/resolve/${PACK_MANIFEST.revision}/${file.path.slice(7)}`:cacheKey(file),{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:options.signal}),{...options,skipIfInstalled:true});
}
export async function exportPack({onProgress=()=>{},check=()=>{}}={}) {
  const cache=await caches.open(await activeModelCache()),parts=makeHeader();
  if(!await cache.match(MODEL_MARKER))throw new Error('Install a complete local model pack before exporting.');
  for(const file of PACK_MANIFEST.files){check();let response=await cache.match(cacheKey(file));if(!response&&file.path.startsWith('licenses/'))response=await fetch(cacheKey(file));parts.push(await verifiedResponse(response,file,onProgress,check).blob());}
  check();return new Blob(parts,{type:'application/octet-stream'});
}
// Serializes transfers across tabs where supported; complete packs remain valid without Web Locks.
export async function withPackLock(operation) {
  if(globalThis.navigator?.locks)return navigator.locks.request('visit-bridge-model-pack-transfer',{ifAvailable:true},lock=>{if(!lock)throw new Error('Another tab is transferring a model pack. Try again after it finishes.');return operation();});
  return operation();
}
