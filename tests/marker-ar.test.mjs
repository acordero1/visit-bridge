import test from 'node:test';
import assert from 'node:assert/strict';
import { projectMarker,createMarkerAR } from '../src/marker-ar.js';
import { bindReplayMarker,markerPayload } from '../src/marker-data.js';
import { createVisit,editInstruction,confirmVisit,selectLanguage,confirmPatientText } from '../src/visit.js';
import { cardFromVisit } from '../src/cards.js';
const approved=()=>bindReplayMarker(cardFromVisit(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return Tuesday.'),true),'en'),true)));
test('projective matrix maps all four plane corners exactly, including perspective and rotation',()=>{
 for(const points of [[{x:10,y:20},{x:290,y:20},{x:290,y:200},{x:10,y:200}],[{x:50,y:40},{x:240,y:80},{x:290,y:260},{x:10,y:220}],[{x:250,y:20},{x:270,y:200},{x:10,y:240},{x:30,y:10}]]){
  const m=projectMarker(points),source=[[0,0],[280,0],[280,180],[0,180]];source.forEach(([x,y],i)=>{const denominator=m[3]*x+m[7]*y+m[15];assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/denominator-points[i].x)<1e-7);assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/denominator-points[i].y)<1e-7);});}
 assert.throws(()=>projectMarker(Array(4).fill({x:0,y:0})));assert.throws(()=>projectMarker([{x:NaN,y:0}]));
});
test('marker camera accepts only this approved reference, updates an immutable plane and hides on tracking loss or stop',()=>{
 let callbacks,started=0,stopped=0;const states=[],text={},title={},notice={},plane={hidden:true,style:{},scrollHeight:100,querySelector:selector=>selector.includes('title')?title:selector.includes('notice')?notice:text},video={getBoundingClientRect:()=>({width:320,height:240})},stage={hidden:true,querySelector:selector=>selector==='video'?video:plane};
 const ar=createMarkerAR({onState:s=>states.push(s),scannerFactory:options=>{callbacks=options;return{start:()=>started++,stop:()=>stopped++};}}),c=approved(),payload=markerPayload(c);ar.start(c,stage,0);assert.equal(started,1);c.instruction='Changed after start';
 const location={topLeftCorner:{x:100,y:80},topRightCorner:{x:200,y:80},bottomRightCorner:{x:200,y:180},bottomLeftCorner:{x:100,y:180}};
 callbacks.onFrame({detection:{data:payload,location},width:320,height:240});assert.equal(plane.hidden,false);assert.equal(text.textContent,'Return Tuesday.');assert.match(plane.style.transform,/matrix3d/);assert.equal(states.at(-1).status,'tracking');
 callbacks.onFrame({detection:{data:'VB1:'+'0'.repeat(32),location},width:320,height:240});assert.equal(plane.hidden,true);assert.match(states.at(-1).message,/different marker/);
 callbacks.onFrame({detection:null,width:320,height:240});assert.equal(plane.hidden,true);ar.stop();assert.equal(stopped,1);assert.equal(stage.hidden,true);callbacks.onFrame({detection:{data:payload,location},width:320,height:240});assert.equal(plane.hidden,true);
 ar.start({...approved(),patientApprovedRevision:null},stage);assert.equal(started,1);assert.equal(states.at(-1).status,'unavailable');
});
test('oversized projected instructions remain available below rather than being clipped in the camera plane',()=>{
 const title={},text={},notice={},plane={scrollHeight:500,querySelector:selector=>selector.includes('title')?title:selector.includes('notice')?notice:text},stage={querySelector:selector=>selector==='video'?{}:plane};
 const ar=createMarkerAR({onState(){},scannerFactory:()=>({start(){},stop(){}})});ar.start(approved(),stage,0);assert.equal(text.hidden,true);assert.match(notice.textContent,/complete approved words below/);ar.stop();
});
