import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultKeys, unlockVaultKey, encryptCard, decryptCard, rewrapVaultKey } from '../src/vault-crypto.js';
import { createVaultRepository } from '../src/storage.js';
import { createVisit, editInstruction, selectLanguage, confirmVisit, confirmPatientText } from '../src/visit.js';
import { cardFromVisit, saveApprovedCard, isValidCard } from '../src/cards.js';
import { setPermission, permitted } from '../src/consent.js';
import { createSessionController } from '../src/session.js';
const password='Synthetic tests only 12345', next='Another synthetic phrase 12345';
const visit=()=>setPermission(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the community clinic on Tuesday.'),true),'en'),true),'storage','granted');
const card=()=>cardFromVisit(visit());
function memory(legacy=[]) {
 let data={config:null,legacy:structuredClone(legacy),encrypted:[]};
 const store={fail:false,abortAll(){},async read(){return structuredClone(data);},async commit(expected,change,allowed){
  if(store.fail || !allowed() || (data.config ? `${data.config.vaultId}:${data.config.wrapRevision}:${data.config.wrappedKey}`:null)!==expected)throw new Error('Commit refused');
  if(change.erase)data={config:null,legacy:[],encrypted:[]};
  if(change.config)data.config=structuredClone(change.config);
  for(const c of change.put||[])data.encrypted=[...data.encrypted.filter(x=>x.id!==c.id),structuredClone(c)];
  if(change.clearLegacy)data.legacy=[];
  data.encrypted=data.encrypted.filter(c=>!(change.remove||[]).includes(c.id));
 },get data(){return data;}};return store;
}
test('whole payload is authenticated, nonextractable, bound to identity and uses fresh nonces',async()=>{
 const {config,key}=await createVaultKeys(password),c=card(),a=await encryptCard(c,key,config.vaultId),b=await encryptCard(c,key,config.vaultId);
 assert.equal(key.extractable,false);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);
 assert.equal(JSON.stringify(a).includes(c.instruction),false);assert.deepEqual(await decryptCard(a,key,config.vaultId),c);
 for(const broken of [{...a,id:'other'},{...a,ciphertext:(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1)},{...a,format:9}])await assert.rejects(decryptCard(broken,key,config.vaultId));
 await assert.rejects(decryptCard(a,key,'other-vault'));await assert.rejects(unlockVaultKey(config,'wrong'));
});
test('rewrapping changes password without changing card data key',async()=>{
 const {config,key}=await createVaultKeys(password),encrypted=await encryptCard(card(),key,config.vaultId),rewrapped=await rewrapVaultKey(config,password,next);
 assert.equal(rewrapped.wrapRevision,1);await assert.rejects(unlockVaultKey(rewrapped,password));
 assert.equal((await decryptCard(encrypted,await unlockVaultKey(rewrapped,next),config.vaultId)).instruction,visit().patientText);
 await assert.rejects(createVaultKeys('short'));await assert.rejects(rewrapVaultKey(config,'wrong',next));
});
test('legacy versions migrate losslessly; failure leaves originals; ciphertext is the only saved payload',async()=>{
 const legacy=[1,2,3,4,5].map(schemaVersion=>({...card(),schemaVersion}));const store=memory(legacy),repository=createVaultRepository(store);
 store.fail=true;await assert.rejects(repository.setup(password));assert.deepEqual(store.data.legacy,legacy);assert.equal(store.data.config,null);
 store.fail=false;await repository.setup(password);assert.equal(store.data.legacy.length,0);assert.equal(store.data.encrypted.length,5);
 const loaded=await repository.list();assert.deepEqual(loaded.map(x=>x.id).sort(),legacy.map(x=>x.id).sort());assert.ok(loaded.every(isValidCard));
 repository.lock();await assert.rejects(repository.list());const before=structuredClone(store.data);await assert.rejects(repository.unlock('wrong'));assert.deepEqual(store.data,before);
 await repository.unlock(password);assert.equal((await repository.list()).length,5);
 await repository.remove(legacy[0].id);assert.equal((await repository.list()).length,4);
 await repository.changePassphrase(password,next);assert.equal(repository.isUnlocked(),false);await repository.unlock(next);assert.equal((await repository.list()).length,4);
 await repository.erase();assert.deepEqual(store.data,{config:null,legacy:[],encrypted:[]});
});
test('invalid legacy cards and tampered saved cards never partially unlock or migrate',async()=>{
 const invalid=memory([{...card(),instruction:''}]),a=createVaultRepository(invalid);await assert.rejects(a.setup(password));assert.equal(invalid.data.legacy.length,1);assert.equal(invalid.data.config,null);
 const store=memory(),r=createVaultRepository(store);await r.setup(password);await r.save(card());r.lock();store.data.encrypted[0].id='substituted';await assert.rejects(r.unlock(password));assert.equal(r.isUnlocked(),false);
});
test('lock during key derivation or encryption cancels late results and writes',async()=>{
 const store=memory(),r=createVaultRepository(store);const pending=r.setup(password);r.lock();await assert.rejects(pending);assert.equal(store.data.config,null);
 await r.setup(password);const saving=r.save(card());r.lock();await assert.rejects(saving);assert.equal(store.data.encrypted.length,0);
 const unlocking=r.unlock(password);r.lock();await assert.rejects(unlocking);assert.equal(r.isUnlocked(),false);
});
test('other tabs cannot write with stale configuration after passphrase change',async()=>{
 const store=memory(),a=createVaultRepository(store),b=createVaultRepository(store);await a.setup(password);await b.unlock(password);await a.changePassphrase(password,next);await assert.rejects(b.save(card()));assert.equal(store.data.encrypted.length,0);
});
test('separate purpose permissions preserve display and deny unauthorized persistence',async()=>{
 let v=visit();v=setPermission(v,'storage','declined');v=setPermission(v,'dictation','granted');assert.equal(permitted(v,'storage'),false);assert.equal(permitted(v,'dictation'),true);assert.equal(isValidCard(cardFromVisit(v)),true);
 let writes=0;await assert.rejects(saveApprovedCard(v,{save:async()=>writes++}));assert.equal(writes,0);
 const store=memory(),r=createVaultRepository(store);await r.setup(password);await assert.rejects(r.save(cardFromVisit(v)));assert.equal(store.data.encrypted.length,0);
 await r.save(card());assert.equal((await r.list()).length,1);
});
test('session timer resets on activity and background immediately stops media before timed lock',()=>{
 const timers=new Map();let id=0;const events=[];
 const clock={setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(n){timers.delete(n);}};
 const s=createSessionController({clock,onLock:r=>events.push(['lock',r]),stopMedia:()=>events.push(['stop'])});
 s.start();assert.deepEqual([...timers.values()].map(x=>x.ms),[300000]);s.touch();assert.equal(timers.size,1);
 s.visibility(true);assert.deepEqual(events,[['stop']]);assert.equal(timers.size,2);s.visibility(false);assert.equal(timers.size,1);
 s.visibility(true);[...timers.values()].find(t=>t.ms===60000).fn();assert.equal(s.isActive(),false);assert.equal(timers.size,0);assert.equal(events.at(-1)[0],'lock');
 s.start();[...timers.values()][0].fn();assert.equal(s.isActive(),false);
});

test('expired background or idle deadlines lock even when suspended timers did not fire',()=>{
 let time=0,locks=0;const timers=new Map();let id=0;
 const clock={setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(key){timers.delete(key);}};
 const session=createSessionController({clock,now:()=>time,stopMedia(){},onLock(){locks++;}});
 session.start();session.visibility(true);time=60001;session.visibility(false);assert.equal(locks,1);assert.equal(session.isActive(),false);
 session.start();time+=300001;session.visibility(false);assert.equal(locks,2);assert.equal(timers.size,0);
});
