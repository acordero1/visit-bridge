import { initializeOffline } from './offline.js';
import { DEVICE_CHECKS, RESULT_STATUSES, makeDeviceReport } from './device-protocol.js';
const $=id=>document.getElementById(id);
let snapshot={},shell={ready:false},generation=0,downloadURL=null;
for(const check of DEVICE_CHECKS){
  const article=document.createElement('article'),heading=document.createElement('h3'),instruction=document.createElement('p'),statusLabel=document.createElement('label'),select=document.createElement('select'),noteLabel=document.createElement('label'),note=document.createElement('textarea');
  heading.textContent=check.title;instruction.textContent=check.instruction;
  statusLabel.textContent='Result';select.id=`result-${check.id}`;
  for(const status of RESULT_STATUSES){const option=document.createElement('option');option.value=status;option.textContent=status;select.append(option);}
  noteLabel.textContent='Observed result and method';note.id=`note-${check.id}`;note.maxLength=1200;
  statusLabel.append(select);noteLabel.append(note);article.append(heading,instruction,statusLabel,noteLabel);$('checks').append(article);
}
async function refresh(){
 const token=++generation;
 const result={origin:location.origin,capturedAt:new Date().toISOString(),secureContext:isSecureContext,browserOnlineHint:navigator.onLine,serviceWorkerSupported:'serviceWorker'in navigator,shellReady:shell.ready,appUpdateWaiting:shell.updateAvailable===true,cameraAPIPresent:Boolean(navigator.mediaDevices?.getUserMedia),immersiveAR:'not checked',webAssembly:typeof WebAssembly!=='undefined',webGPU:Boolean(navigator.gpu),indexedDB:Boolean(globalThis.indexedDB),voices:[]};
 if(globalThis.caches){try{result.shellCaches=(await caches.keys()).filter(key=>key.startsWith('visit-bridge-shell-'));result.checklistCached=false;for(const name of result.shellCaches){const cache=await caches.open(name);const files=await Promise.all(['/device-check.html','/src/device-check.js','/src/device-check.css','/src/device-protocol.js','/src/offline.js'].map(path=>cache.match(path)));if(files.every(Boolean))result.checklistCached=true;}}catch{result.shellCaches='unavailable';}}
 if(navigator.xr?.isSessionSupported){try{result.immersiveAR=await navigator.xr.isSessionSupported('immersive-ar');}catch{result.immersiveAR='check failed';}}
 if(globalThis.speechSynthesis){const voices=speechSynthesis.getVoices().filter(v=>/^(en|es)(-|$)/i.test(v.lang));result.voices=[...new Set(voices.map(v=>v.lang))].map(language=>({language,localVoiceCount:voices.filter(v=>v.lang===language&&v.localService===true).length}));}
 if(navigator.storage?.estimate){try{const e=await navigator.storage.estimate();result.storage={usageBytes:e.usage,quotaBytes:e.quota,method:'browser estimate; not memory/RAM'};}catch{result.storage='estimate unavailable';}}
 if(token!==generation)return;snapshot=result;$('capabilities').textContent=JSON.stringify(result,null,2);
}
$('refresh').addEventListener('click',refresh);
globalThis.speechSynthesis?.addEventListener('voiceschanged',refresh);
initializeOffline(state=>{shell=state;refresh();});refresh();
$('export').addEventListener('click',()=>{
 try{
  const checks=Object.fromEntries(DEVICE_CHECKS.map(c=>[c.id,{status:$(`result-${c.id}`).value,note:$(`note-${c.id}`).value}]));
  const report=makeDeviceReport({device:$('device').value,os:$('os').value,browser:$('browser').value,context:$('context').value,markerMedium:$('medium').value,checks,capabilities:snapshot,recordedAt:new Date().toISOString()});
  if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=downloadURL;link.download='visit-bridge-device-validation.json';link.click();$('status').textContent='Report download requested. Entries remain here until reload; confirm the file is saved.';
 }catch(error){$('status').textContent=error.message;}
});
addEventListener('pagehide',()=>{if(downloadURL)URL.revokeObjectURL(downloadURL);});
