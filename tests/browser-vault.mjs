import { createDeviceStore, createVaultRepository } from '../src/storage.js';
import { createVisit, editInstruction, selectLanguage, confirmVisit, confirmPatientText } from '../src/visit.js';
import { cardFromVisit } from '../src/cards.js';
import { setPermission } from '../src/consent.js';
const output=document.querySelector('#results'), results=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);results.push(message);output.textContent=results.join('\n');};
const password='Disposable QA phrase 12345';
const card=()=>cardFromVisit(setPermission(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.'),true),'en'),true),'storage','granted'));
async function seedLegacy(cards) {
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('visit-bridge',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise((resolve,reject)=>{const t=db.transaction('care-cards','readwrite');for(const c of cards)t.objectStore('care-cards').put(c);t.oncomplete=resolve;t.onabort=()=>reject(t.error);});db.close();
}
try {
 const legacy=[1,2,3,4,5].map(schemaVersion=>({...card(),schemaVersion}));
 await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase('visit-bridge');request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
 const old=await new Promise((resolve,reject)=>{const request=indexedDB.open('visit-bridge',1);request.onupgradeneeded=()=>request.result.createObjectStore('care-cards',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 await new Promise((resolve,reject)=>{const tx=old.transaction('care-cards','readwrite');for(const c of legacy)tx.objectStore('care-cards').put(c);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});old.close();
 const store=createDeviceStore(),r=createVaultRepository(store);
 await r.setup(password);const state=await store.read();
 const fenced=await new Promise(resolve=>{const request=indexedDB.open('visit-bridge',1);request.onerror=()=>resolve(request.error.name==='VersionError');request.onsuccess=()=>{request.result.close();resolve(false);};});
 assert(fenced,'PASS version 1 clients cannot reopen plaintext storage');
 assert(state.legacy.length===0&&state.encrypted.length===5,'PASS native transaction migrated all legacy records');
 assert(!JSON.stringify(state).includes('Return to the clinic'),'PASS no instruction text in persisted vault stores');
 assert((await r.list()).length===5,'PASS authenticated legacy cards reopen');
 r.lock();await r.unlock(password);await r.save(card());assert((await r.list()).length===6,'PASS native encrypted write/read');
 const second=createVaultRepository(createDeviceStore());await second.unlock(password);
 await r.changePassphrase(password,'Replacement QA phrase 12345');
 let rejected=false;try{await second.save(card());}catch{rejected=true;}assert(rejected,'PASS stale second tab configuration cannot write');
 await r.unlock('Replacement QA phrase 12345');
 // Queue a transaction and lock before its async open completes. Authorization is checked in the transaction callback.
 const snapshot=await store.read();const pending=r.save(card());r.lock();try{await pending;}catch{}
 assert((await store.read()).encrypted.length===snapshot.encrypted.length,'PASS lock cancels native pending write');
 await r.unlock('Replacement QA phrase 12345');await r.remove(legacy[0].id);assert((await r.list()).length===5,'PASS native deletion');
 await r.erase();assert(!(await r.inspect()).configured,'PASS explicit erase removes vault settings');
 const invalid={...card(),instruction:''};await seedLegacy([invalid]);let failed=false;try{await r.setup(password);}catch{failed=true;}
 assert(failed&&(await store.read()).legacy.length===1&&!(await r.inspect()).configured,'PASS invalid migration keeps original record');
 await r.erase();await r.setup(password);await r.save(card());r.lock();
 assert(!r.isUnlocked(),'PASS disposable UI fixture ready, locked');
 output.textContent+='\nALL 11 NATIVE CHECKS PASSED\nQA login: Disposable QA phrase 12345 (test origin only)';
} catch(error) {output.textContent+='\nFAIL '+error.message;}
