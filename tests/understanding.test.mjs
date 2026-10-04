import { setPermission } from '../src/consent.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createVisit, editInstruction, confirmVisit, selectLanguage, confirmPatientText, setPatientText, setStructuredHandoff, markUnderstanding, setReturnTemplate } from '../src/visit.js';
import { cardFromVisit, isValidCard, saveApprovedCard } from '../src/cards.js';
import { createHandoff, editHandoff } from '../src/handoff.js';
import { currentUnderstanding, saveStamp, patientLines } from '../src/understanding.js';
const approve = () => setPermission(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.'),true),'en'),true),'storage','granted');
const pack = JSON.parse(await readFile(new URL('../packs/es-return-visit-v1.1.json',import.meta.url)));
test('each worker result is approval-gated, saved and reopened without recording patient response', async()=>{
 assert.throws(()=>markUnderstanding(createVisit(),'understood'));
 assert.throws(()=>markUnderstanding(approve(),'scored'));
 for (const result of ['understood','clarified','needs-follow-up']) {
  const v=markUnderstanding(approve(),result); let stored;
  await saveApprovedCard(v,{save:async c=>{stored=structuredClone(c);}});
  assert.equal(isValidCard(stored),true); assert.equal(currentUnderstanding(stored).result,result);
  assert.deepEqual(Object.keys(stored.understanding).sort(),['approvedStamp','markedAt','result']);
 }
 assert.equal(cardFromVisit(approve()).understanding,null);
});
test('source, wording, structured plan, language and fresh approval invalidate observation',()=>{
 const v=markUnderstanding(approve(),'understood');
 for (const edited of [editInstruction(v,'Return Wednesday.'),setPatientText(v,'Return to the clinic on Tuesday.\nBring your appointment card.'),selectLanguage(v,'en'),setStructuredHandoff(v,createHandoff(v.revision)),confirmPatientText(v,true),confirmVisit(v,true)]) {
  if(edited===v) assert.equal(currentUnderstanding(edited).result,'understood');
  else assert.equal(currentUnderstanding(edited),null);
 }
 assert.equal(currentUnderstanding({...v,language:'es'}),null);
 const es=confirmPatientText(selectLanguage(confirmVisit(setReturnTemplate(createVisit(),{id:'return-visit-v1',date:'2026-10-06',location:'clinic'}),true),'es',pack),true);
 assert.equal(currentUnderstanding(selectLanguage(markUnderstanding(es,'understood'),'en')),null);
});
test('corrupt or stale observations cannot authenticate another approved snapshot',()=>{
 const c=cardFromVisit(markUnderstanding(approve(),'needs-follow-up'));
 for(const patch of [{result:'automatically-understood'},{markedAt:'bad'},{approvedStamp:'different'},{patientAnswer:'private'}]) assert.equal(isValidCard({...c,understanding:{...c.understanding,...patch}}),false);
 assert.equal(isValidCard({...c,understanding:undefined}),false);
 assert.equal(isValidCard({...c,instruction:c.instruction+' Bring a letter.'}),false);
});
test('observation changes require another save while previously saved copy remains unchanged',()=>{
 const v=markUnderstanding(approve(),'clarified'), c=cardFromVisit(v), next=markUnderstanding(v,'understood');
 assert.notEqual(saveStamp(v),saveStamp(next)); assert.equal(c.understanding.result,'clarified');
 assert.notEqual(saveStamp(next),saveStamp({...next,understanding:null}));
});
test('legacy schema 1 through 4 remain readable with no fabricated understanding result',()=>{
 const current=cardFromVisit(approve());
 for(const schemaVersion of [1,2,3,4]) { const c={...current,schemaVersion};delete c.understanding;assert.equal(isValidCard(c),true);assert.equal(currentUnderstanding(c),null); }
});
test('action symbols preserve every approved character and do not infer unknown actions',()=>{
 let h=createHandoff(1,'return');
 for(const [key,value] of Object.entries({action:'Return',place:'the clinic',date:'2026-10-06',time:'09:00',item:'referral letter',task:'Ask at reception'})) h=editHandoff(h,key,{value,state:'confirmed'});
 const instruction='Return\nPlace: the clinic.\nDate: Tuesday, 2026-10-06.\nTime: 09:00.\nBring: referral letter.\nAsk at reception';
 const lines=patientLines({instruction,handoff:h}); assert.equal(lines.map(x=>x.text).join('\n'),instruction);
 assert.deepEqual(lines.map(x=>x.symbol),['action','place','date','time','item','task']);
 assert.equal(patientLines({instruction:'Some arbitrary approved words.'})[0].symbol,'note');
});
test('new Spanish pack has an explicit demonstration prompt and old saved pack stays supported',async()=>{
 const oldPack=JSON.parse(await readFile(new URL('../packs/es-return-visit-v1.json',import.meta.url)));
 for(const p of [oldPack,pack]) {
  const v=confirmPatientText(selectLanguage(confirmVisit(setReturnTemplate(createVisit(),{id:'return-visit-v1',date:'2026-10-06',location:'clinic'}),true),'es',p),true);
  const c=cardFromVisit(markUnderstanding(v,'clarified')); assert.equal(isValidCard(c),true);
 }
 assert.ok(pack.labels.teachBack); assert.equal(pack.professionalReview,null);
});
