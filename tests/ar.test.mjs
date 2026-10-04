import test from 'node:test';
import assert from 'node:assert/strict';
import {createARController} from '../src/ar.js';
import {cardLines,placementMatrix} from '../src/ar-renderer.js';
import {cardFromVisit} from '../src/cards.js';
import {createVisit,editInstruction,confirmVisit,selectLanguage,confirmPatientText} from '../src/visit.js';
const approved=()=>cardFromVisit(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.'),true),'en'),true));
function fixture(){let frame,hit=true,tracking=true,ended=0,cancelled=0,disposed=0,rendered=null,requested=0,options;
 const events={},states=[],draws=[],steps=[];
 const session={addEventListener:(name,f)=>events[name]=f,requestReferenceSpace:async kind=>({kind}),requestHitTestSource:async()=>({cancel:()=>cancelled++}),requestAnimationFrame:f=>frame=f,end:async()=>{ended++;events.end?.();}};
 const environment={isSecureContext:true,navigator:{xr:{isSessionSupported:async()=>true,requestSession:async(mode,init)=>{requested++;options=init;assert.equal(mode,'immersive-ar');return session;}}}};
 const controller=createARController({environment,onState:s=>states.push(s),rendererFactory:(_,card)=>{rendered=card;return{setStep:index=>steps.push(index),draw:(...args)=>draws.push(args),dispose:()=>disposed++};}});
 return {controller,session,events,states,draws,steps,environment,counts:()=>({ended,cancelled,disposed,requested}),options:()=>options,rendered:()=>rendered,
 tick(){const callback=frame;frame=null;callback(0,{getViewerPose:()=>tracking?{transform:{position:{x:0,y:1,z:1}},views:[]}:null,getHitTestResults:()=>hit?[{getPose:()=>({transform:{position:{x:0,y:0,z:-1}}})}]:[]});},setHit:v=>hit=v,setTracking:v=>tracking=v};
}
test('AR discovery never opens camera; only an independently validated snapshot starts a session',async()=>{
 const f=fixture();await f.controller.check();assert.equal(f.counts().requested,0);assert.equal(f.states.at(-1).status,'ready');
 await f.controller.start({...approved(),patientApprovedRevision:null},{});assert.equal(f.counts().requested,0);
 const card=approved();await f.controller.start(card,{});card.instruction='changed later';assert.equal(f.rendered().instruction,'Return to the clinic on Tuesday.');assert.deepEqual(f.options().requiredFeatures,['hit-test','dom-overlay']);await f.controller.stop();
});
test('placement requires a current hit, persists in local space, and reposition removes the old point',async()=>{
 const f=fixture();await f.controller.start(approved(),{});f.controller.place();assert.equal(f.states.at(-1).placed,false);
 f.tick();assert.equal(f.states.at(-1).canPlace,true);f.controller.place();f.tick();const matrix=f.draws.at(-1)[1];assert.equal(f.states.at(-1).placed,true);
 f.controller.rotate(Math.PI/12);f.controller.resize(.1);f.tick();assert.notDeepEqual(f.draws.at(-1)[1],matrix);
 f.controller.reposition();f.setHit(false);f.tick();assert.equal(f.draws.at(-1)[1],null);assert.equal(f.states.at(-1).status,'scanning');await f.controller.stop();assert.deepEqual(f.counts(),{ended:1,cancelled:1,disposed:1,requested:1});
});
test('tracking loss hides the card; ending and navigation stop resources and stale frames',async()=>{
 const f=fixture();await f.controller.start(approved(),{});f.tick();f.controller.place();f.setTracking(false);f.tick();assert.equal(f.states.at(-1).status,'tracking');assert.equal(f.draws.at(-1)[0],null);
 f.setTracking(true);f.tick();assert.equal(f.states.at(-1).status,'placed');await f.controller.stop();const count=f.draws.length;f.tick();assert.equal(f.draws.length,count);assert.equal(f.controller.isActive(),false);
});
test('cancelled permission request ends a late session without creating a renderer',async()=>{
 const f=fixture();let resolve;f.environment.navigator.xr.requestSession=()=>new Promise(r=>resolve=r);const starting=f.controller.start(approved(),{});await f.controller.stop();resolve(f.session);await starting;assert.equal(f.rendered(),null);assert.equal(f.counts().ended,1);
});
test('permission rejection and unavailable devices retain the normal card without starting graphics',async()=>{
 const f=fixture();f.environment.navigator.xr.requestSession=async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});};await f.controller.start(approved(),{});assert.match(f.states.at(-1).message,/declined/);assert.equal(f.rendered(),null);
 f.environment.navigator.xr=undefined;await f.controller.check();assert.equal(f.states.at(-1).status,'unavailable');
});
test('AR text wrapping retains long words and placement uses the selected world position',()=>{
 const ctx={measureText:text=>({width:text.length})};const text='Return to the community clinic on Tuesday, 2026-10-06.';
 assert.deepEqual(cardLines(ctx,'Return\nBring the appointment slip',100),['Return','Bring the appointment slip']);
 assert.equal(cardLines(ctx,text,20).join(' '),text);assert.equal(cardLines(ctx,'abcdefghij',3).join(''),'abcdefghij');
 const m=placementMatrix([2,0,-3],0);assert.equal(m[12],2);assert.equal(m[14],-3);assert.ok(m[13]>.4);assert.equal(m[15],1);
});

test('AR replay passes an approved step to the renderer, restores full card and refuses invalid step selection',async()=>{
 const f=fixture();await f.controller.start(approved(),{},0);assert.deepEqual(f.steps,[0]);f.controller.setStep(null);assert.deepEqual(f.steps,[0,null]);f.controller.setStep(50);assert.equal(f.controller.isActive(),false);assert.equal(f.states.at(-1).status,'error');
 const invalid=fixture();await invalid.controller.start(approved(),{},50);assert.equal(invalid.counts().requested,0);
});
