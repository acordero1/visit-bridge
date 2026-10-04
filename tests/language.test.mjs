import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createVisit, editInstruction, setReturnTemplate, selectLanguage, confirmVisit, confirmPatientText, canShare, setPatientText } from '../src/visit.js';
import { validTemplate, templateInstruction, validPack } from '../src/templates.js';
import { cardFromVisit, isValidCard } from '../src/cards.js';
import { PACK_SHA256, PACK_URL, loadLanguagePack, installLanguagePack } from '../src/language-packs.js';
const bytes = await readFile(new URL('../packs/es-return-visit-v1.json', import.meta.url));
const pack = JSON.parse(bytes);
const template = { id: 'return-visit-v1', date: '2026-10-06', location: 'community-clinic' };
const translated = () => selectLanguage(confirmVisit(setReturnTemplate(createVisit(), template), true), 'es', pack);
test('date and place survive exact English/Spanish rendering; invalid dates and unsupported places are refused', () => {
 assert.equal(templateInstruction(template), 'Return to the community clinic on Tuesday, 2026-10-06.');
 assert.equal(templateInstruction(template, pack), 'Vuelva a la clínica comunitaria el martes, 2026-10-06.');
 for (const t of [{...template,date:'2026-02-29'},{...template,date:'2026-02-31'},{...template,location:'home'}]) assert.equal(validTemplate(t),false);
 assert.equal(validTemplate({...template,date:'2028-02-29'}),true);
 assert.equal(validPack({...pack,professionalReview:'invented'}),false);
 assert.equal(validPack({...pack,sentence:'Take medication {location} {weekday} {date}'}),false);
});
test('Spanish requires installed supported pack and structured source, plus independent final approval', () => {
 const source = confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.'),true);
 assert.throws(()=>selectLanguage(source,'es',pack));
 assert.throws(()=>selectLanguage(setReturnTemplate(createVisit(),template),'es'));
 let v=translated(); assert.equal(canShare(v),false); assert.throws(()=>confirmPatientText(v,false));
 v=confirmPatientText(v,true); assert.equal(canShare(v),true);
 assert.throws(()=>setPatientText(v,'different'));
 assert.equal(canShare({...v,patientText:v.patientText.replace('2026-10-06','2026-10-07')}),false);
 assert.equal(canShare(setReturnTemplate(v,{...template,date:'2026-10-07'})),false);
 assert.equal(canShare(selectLanguage(v,'en')),false);
});
test('saved Spanish snapshot retains pack provenance and refuses tampered slots, phrases or approvals', () => {
 const card=cardFromVisit(confirmPatientText(translated(),true)); assert.equal(isValidCard(card),true);
 assert.equal(card.translation.pack.reviewStatus,'demonstration-unvalidated');
 assert.equal(card.translation.pack.professionalReview,null);
 const altered=structuredClone(card); altered.translation.pack.locations['community-clinic']='la farmacia'; assert.equal(isValidCard(altered),false);
 assert.equal(isValidCard({...card,patientApprovedRevision:null}),false);
 assert.equal(isValidCard({...card,template:{...template,date:'2026-10-07'}}),false);
 assert.equal(isValidCard({...card,schemaVersion:2}),false);
});
test('language installation checks pinned bytes and cached loading needs no network', async () => {
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex'); assert.equal(hash,PACK_SHA256);
 const previousCache=globalThis.caches, previousFetch=globalThis.fetch; let stored=null, downloads=0;
 globalThis.caches={open:async()=>({match:async()=>stored?.clone(),put:async(url,response)=>{assert.equal(url,PACK_URL);stored=response;}})};
 globalThis.fetch=async()=>{downloads++;return new Response(bytes);};
 try { assert.equal(await loadLanguagePack(),null); assert.deepEqual(await installLanguagePack(),pack); assert.equal(downloads,1);
 globalThis.fetch=async()=>{throw new Error('offline');}; assert.deepEqual(await loadLanguagePack(),pack);
 stored=new Response('{}'); await assert.rejects(loadLanguagePack(),/integrity/);
 } finally { globalThis.caches=previousCache;globalThis.fetch=previousFetch; }
});
