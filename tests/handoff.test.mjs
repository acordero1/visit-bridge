import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoff, editHandoff, approveHandoff, handoffIssues, handoffText, parseExtraction, validHandoff, templateHandoff, spanishHandoffSupported } from '../src/handoff.js';
import { createVisit, editInstruction, setStructuredHandoff, confirmVisit, selectLanguage, confirmPatientText, canShare, setPatientText, visitStamp } from '../src/visit.js';
import { cardFromVisit, isValidCard } from '../src/cards.js';
import { setReturnTemplate } from '../src/visit.js';
import { createModelController } from '../src/model.js';
const filled = (rev=1) => {
  let h=createHandoff(rev,'return');
  for(const [key,value] of Object.entries({action:'Return',date:'2026-10-06',place:'the clinic'})) h=editHandoff(h,key,{value,state:'confirmed'});
  return h;
};
const proposal = values => JSON.stringify(Object.fromEntries(['action','date','time','place','item','task','reported'].map(key=>[key,values[key] ? {value:values[key],quote:values[key]} : null])));
const approved = () => {
  let v=editInstruction(createVisit(),'Return to the clinic on 2026-10-06.');
  v=setStructuredHandoff(v,filled(v.revision));
  return confirmPatientText(selectLanguage(confirmVisit(v,true),'en'),true);
};
test('required details and review states block structured approval; optional blanks remain explicit',()=>{
  let h=createHandoff(1,'return'); assert.equal(handoffIssues(h,1).length,3); assert.throws(()=>approveHandoff(h,1));
  h=filled(); assert.equal(handoffIssues(h,1).length,0); assert.ok(approveHandoff(h,1).approvedAt);
  assert.throws(()=>approveHandoff(editHandoff(h,'time',{required:true}),1));
  assert.throws(()=>approveHandoff(editHandoff(h,'date',{state:'not-needed'}),1));
  assert.throws(()=>approveHandoff(editHandoff(h,'date',{value:'2026-02-30',state:'confirmed'}),1));
  assert.throws(()=>approveHandoff(editHandoff(h,'time',{value:'at nine',state:'confirmed'}),1));
  assert.throws(()=>approveHandoff(editHandoff(h,'item',{value:'the form',state:'confirmed'}),1));
});
test('patient reported information never becomes patient action text',()=>{
  const h=editHandoff(filled(),'reported',{value:'Patient says transport may be difficult.',state:'confirmed'});
  assert.ok(handoffText(h).includes('2026-10-06')); assert.ok(!handoffText(h).includes('transport'));
});
test('extraction rejects invented facts, fabricated spans, invalid schema and no useful output',()=>{
  const source='Return to the clinic on 2026-10-06.';
  assert.throws(()=>parseExtraction(proposal({action:'Return',date:'2026-10-07'}),source,1,'return',null),/absent/);
  assert.throws(()=>parseExtraction('{"action":"Return"}',source,1,'return',null),/unsupported fields/);
  assert.throws(()=>parseExtraction('not JSON',source,1,'return',null),/invalid structured/);
  assert.throws(()=>parseExtraction(proposal({}),source,1,'return',null),/no usable/);
  const p=JSON.parse(proposal({action:'Return'}));p.action.value='Go back'; assert.throws(()=>parseExtraction(JSON.stringify(p),source,1,'return',null),/exact source/);
});
test('relative dates, conflicting dates and weekday conflicts stay unclear',()=>{
  let h=parseExtraction(proposal({action:'Return',date:'next Tuesday'}),'Return next Tuesday.',1,'return',null);assert.equal(h.fields.date.state,'unclear');
  h=parseExtraction(proposal({action:'Return',date:'2026-10-06'}),'Return 2026-10-06 or 2026-10-07.',1,'return',null);assert.equal(h.fields.date.state,'unclear');
  h=parseExtraction(proposal({action:'Return',date:'2026-10-07'}),'Return Tuesday, 2026-10-07.',1,'return',null);assert.equal(h.fields.date.state,'unclear');
});
test('source-grounded phrases in the wrong role require clarification',()=>{
  const source='Return to the clinic on 2026-10-06. Bring the referral letter.';
  const h=parseExtraction(proposal({action:'Bring the referral letter.',date:'2026-10-06',place:'the referral letter'}),source,1,'return',null);
  assert.equal(h.fields.action.state,'unclear');assert.equal(h.fields.place.state,'unclear');assert.equal(h.fields.item.state,'unclear');
  assert.throws(()=>approveHandoff(editHandoff(filled(),'place',{value:'the referral letter',state:'confirmed'}),1));
  assert.throws(()=>approveHandoff(editHandoff(filled(),'action',{value:'Bring the letter',state:'confirmed'}),1));
});
test('negative, conditional and clinical notes are rejected by administrative extraction',()=>{
  for(const source of ['Do not return Friday.','Maybe refer if transport is available.','Take medicine on Tuesday.']) assert.throws(()=>parseExtraction(proposal({action:source}),source,1,'other',null));
  assert.throws(()=>approveHandoff(editHandoff(filled(),'action',{value:'Take medication',state:'confirmed'}),1));
});
test('exact source evidence survives approval and edited fields become worker additions',()=>{
  const source='Return to the clinic on 2026-10-06.';
  let h=parseExtraction(JSON.stringify({action:'Return',place:'the clinic',date:'2026-10-06',time:null,item:null,task:null,reported:null}),source,1,'return',{id:'test-model',revision:'1'});
  assert.equal(h.fields.place.evidence.start,source.indexOf('the clinic'));
  for(const key of ['action','date','place'])h=editHandoff(h,key,{state:'confirmed'});
  h=approveHandoff(h,1);assert.equal(validHandoff(h,source,1),true);
  const corrupted=structuredClone(h);corrupted.fields.place.evidence.quote='another clinic';assert.equal(validHandoff(corrupted,source,1),false);
  h=editHandoff(h,'place',{value:'community clinic'});assert.equal(h.fields.place.origin,'worker');assert.equal(h.fields.place.evidence,null);assert.equal(h.approvedAt,null);
});
test('structured edits revoke all approvals; old approved saved snapshots survive independently',()=>{
  const v=approved(), c=cardFromVisit(v), stamp=visitStamp(v);assert.equal(isValidCard(c),true);
  const edited=setStructuredHandoff(v,editHandoff(v.handoff,'date',{value:'2026-10-07'}));
  assert.equal(canShare(edited),false);assert.equal(edited.patientApprovedAt,null);assert.notEqual(visitStamp(edited),stamp);assert.equal(isValidCard(c),true);
  assert.equal(editInstruction(v,'Return Thursday.').handoff,null);
  assert.throws(()=>setStructuredHandoff(v,filled(99)),/older source/);
  assert.equal(isValidCard({...c,handoff:{...c.handoff,approvedRevision:999}}),false);
});
test('final wording cannot omit reviewed details and malformed saved evidence is rejected',()=>{
  const v=approved();assert.throws(()=>confirmPatientText(setPatientText(v,'Return to the clinic.'),true),/calendar date/);
  const c=cardFromVisit(v);const malformed=structuredClone(c);malformed.handoff.fields.date.origin='model';malformed.handoff.fields.date.evidence={start:0,end:1};assert.equal(isValidCard(malformed),false);
});
test('Spanish template cannot silently omit added time, item or task',()=>{
  const t={id:'return-visit-v1',date:'2026-10-06',location:'clinic'};const v=setReturnTemplate(createVisit(),t);
  let h=templateHandoff(t,v.originalInstruction,v.revision,'the clinic');assert.equal(spanishHandoffSupported(h,t),true);
  h=editHandoff(h,'time',{value:'09:00',state:'confirmed'});assert.equal(spanishHandoffSupported(h,t),false);
  assert.throws(()=>selectLanguage(setStructuredHandoff(v,h),'es',{}),/cannot express/);
});
test('extraction cancellation ignores late proposals and request carries field revision',async()=>{
  const oldWorker=globalThis.Worker,oldCaches=globalThis.caches;const workers=[],drafts=[];
  globalThis.Worker=class {constructor(){workers.push(this)} postMessage(data){this.data=data} terminate(){this.terminated=true}};
  globalThis.caches={open:async()=>({match:async()=>new Response('installed')})};
  const model=createModelController({onState(){},onDraft:result=>drafts.push(result)});
  try{await model.check();const v=approved();model.extract(v);const w=workers[0];assert.equal(w.data.handoffRevision,v.handoff.revision);assert.equal(w.data.original,v.originalInstruction);
    model.cancel();w.onmessage({data:{type:'extraction',requestId:w.data.requestId}});assert.equal(drafts.length,0);assert.equal(w.terminated,true);
  }finally{model.cancel();globalThis.Worker=oldWorker;globalThis.caches=oldCaches;}
});
