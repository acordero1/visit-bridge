import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisit,editInstruction,confirmVisit,selectLanguage,confirmPatientText,setStructuredHandoff } from '../src/visit.js';
import { cardFromVisit,isValidCard,saveApprovedCard } from '../src/cards.js';
import { createHandoff,editHandoff } from '../src/handoff.js';
import { approvedContentStamp } from '../src/understanding.js';
import { setPermission } from '../src/consent.js';
import { bindReplayMarker,markerPayload } from '../src/marker-data.js';
import { markerMatrix,decodeMarker,resolveMarker } from '../src/markers.js';
import { patientCopyHTML } from '../src/portable-card.js';
import { replaySteps,approvedStep } from '../src/replay.js';
import { createPlaybackController } from '../src/playback.js';
import { createScanner } from '../src/scanner.js';
const visit=()=>setPermission(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.\nBring your letter.'),true),'en'),true),'storage','granted');
const card=()=>bindReplayMarker(cardFromVisit(visit()));
function structured(){let v=editInstruction(createVisit(),'Return on 2026-10-06 to the clinic.');let h=createHandoff(v.revision,'return');for(const [key,value] of Object.entries({action:'Return',date:'2026-10-06',place:'the clinic'}))h=editHandoff(h,key,{value,state:'confirmed'});v=setStructuredHandoff(v,h);return cardFromVisit(confirmPatientText(selectLanguage(confirmVisit(v,true),'en'),true));}
function pixels(payload,scale=6){const matrix=markerMatrix(payload),width=(matrix.length+8)*scale,data=new Uint8ClampedArray(width*width*4).fill(255);for(let row=0;row<matrix.length;row++)for(let col=0;col<matrix.length;col++)if(matrix[row][col])for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){const i=(((row+4)*scale+y)*width+(col+4)*scale+x)*4;data[i]=data[i+1]=data[i+2]=0;}return{data,width};}
test('real QR encoder and decoder round-trip random public references at several sizes and rotation',()=>{
 const c=card(),payload=markerPayload(c);assert.match(payload,/^VB1:[a-f0-9]{32}$/);for(const size of [3,5,8]){const {data,width}=pixels(payload,size);assert.equal(decodeMarker(data,width,width),payload);const rotated=new Uint8ClampedArray(data.length);for(let y=0;y<width;y++)for(let x=0;x<width;x++)rotated.set(data.subarray((y*width+x)*4,(y*width+x)*4+4),(x*width+width-1-y)*4);assert.equal(decodeMarker(rotated,width,width),payload);}
 assert.equal(decodeMarker(new Uint8ClampedArray(100*100*4).fill(255),100,100),null);assert.throws(()=>decodeMarker(new Uint8ClampedArray(4),2000,2000));
 for(const text of [c.id,c.instruction,c.originalInstruction,c.language,c.confirmedAt])assert.equal(payload.includes(text),false);
});
test('lookup refuses unknown, foreign, duplicate and stale references and returns an independent approved snapshot',()=>{
 const a=card(),b=card(),payload=markerPayload(a);assert.throws(()=>resolveMarker('https://example.com',[a,b]),/not a Visit/);assert.throws(()=>resolveMarker('VB1:'+'0'.repeat(32),[a,b]),/unknown/);assert.throws(()=>resolveMarker(payload,[a,a]),/unknown/);
 const bad={...a,instruction:'Different approved words'};assert.equal(isValidCard(bad),false);assert.throws(()=>resolveMarker(payload,[bad,b]),/unknown/);
 const copy=resolveMarker(payload,[a,b]);copy.instruction='mutated';assert.notEqual(copy.instruction,a.instruction);
});
test('saving preserves the marker for identical approval and replaces it when approved content changes',async()=>{
 const v=visit();let stored=[];const repo={list:async()=>stored,save:async c=>{stored=[c];}};const first=await saveApprovedCard(v,repo),again=await saveApprovedCard(v,repo);assert.equal(markerPayload(first),markerPayload(again));
 const changed=confirmPatientText({...v,patientText:'Return Wednesday.',patientTextRevision:v.patientTextRevision+1,patientApprovedRevision:null},true);const next=await saveApprovedCard(changed,repo);assert.notEqual(markerPayload(next),markerPayload(first));assert.throws(()=>resolveMarker(markerPayload(first),stored),/unknown/);assert.equal(isValidCard(next),true);
 const invalid={...next,replayMarker:{...next.replayMarker,approvedStamp:'old'}};assert.equal(isValidCard(invalid),false);assert.equal(markerPayload(invalid),null);
});
test('portable marker contains only the random reference; private source and review data stay out',()=>{
 const c=card();c.originalInstruction='PRIVATE ORIGINAL';c.modelDraft={text:'PRIVATE DRAFT',revision:c.revision,language:'en',model:'test',modelRevision:'pin'};const html=patientCopyHTML(c);assert.ok(html.includes('replay-qr'));assert.ok(html.includes(markerPayload(c)));for(const text of ['PRIVATE ORIGINAL','PRIVATE DRAFT',c.id,approvedContentStamp(c)])assert.equal(html.includes(text),false);
});
test('replay keeps approved structured line order and keeps free-form wording together',()=>{
 const c=structured(),steps=replaySteps(c);assert.equal(steps.map(s=>s.text).join('\n'),c.instruction);assert.ok(steps.length>1);assert.deepEqual(approvedStep(c,1),steps[1]);assert.throws(()=>approvedStep(c,50));assert.throws(()=>replaySteps({...c,patientApprovedRevision:null}));const free=card();assert.deepEqual(replaySteps(free).map(s=>s.text),[free.instruction]);
});
test('step playback speaks only the exact selected approved segment through a matching local voice',()=>{
 const spoken=[],states=[],voice={lang:'en-US',name:'local',voiceURI:'local',localService:true};const engine={getVoices:()=>[voice],speak:u=>spoken.push(u),cancel(){},addEventListener(){},removeEventListener(){}};
 const p=createPlaybackController({environment:{speechSynthesis:engine,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}},onState:s=>states.push(s),schedule:()=>1,unschedule(){}}),c=structured();p.play(c,1);assert.equal(spoken[0].text,replaySteps(c)[1].text);p.play(c,999);assert.equal(spoken.length,1);p.play({...c,patientApprovedRevision:null},0);assert.equal(spoken.length,1);p.destroy();
});
function scanFixture(){let stopped=0,resolve;const states=[],found=[],timers=new Map();let t=0;const frame=pixels(markerPayload(card()));const stream={getTracks:()=>[{stop:()=>stopped++}]};const video={videoWidth:frame.width,videoHeight:frame.width,srcObject:null,play:async()=>{},pause(){}};
 const ctx={drawImage(){},getImageData:()=>({...frame,height:frame.width})},environment={isSecureContext:true,navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}},document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})},setTimeout:f=>{timers.set(++t,f);return t;},clearTimeout:id=>timers.delete(id)};
 const scanner=createScanner({environment,onState:s=>states.push(s),onMarker:x=>found.push(x)});return{scanner,states,found,video,stream,environment,resolve:()=>resolve(stream),stopped:()=>stopped,timers};}
test('scan opens no camera until start, requests no audio, decodes locally and stops tracks before publishing',async()=>{
 const f=scanFixture();assert.equal(f.stopped(),0);const original=f.environment.navigator.mediaDevices.getUserMedia;f.environment.navigator.mediaDevices.getUserMedia=opts=>{assert.equal(opts.audio,false);return original(opts);};const pending=f.scanner.start(f.video);f.resolve();await pending;assert.equal(f.found.length,1);assert.equal(f.stopped(),1);assert.equal(f.video.srcObject,null);assert.equal(f.timers.size,0);
});
test('cancelled permission request stops its late stream; denied access and unavailable devices keep manual paths',async()=>{
 const f=scanFixture(),pending=f.scanner.start(f.video);f.scanner.stop();f.resolve();await pending;assert.equal(f.stopped(),1);assert.equal(f.found.length,0);
 const g=scanFixture();g.environment.navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});};await g.scanner.start(g.video);assert.match(g.states.at(-1).message,/declined/);g.environment.isSecureContext=false;await g.scanner.start(g.video);assert.equal(g.states.at(-1).status,'unavailable');
});
test('continuous scanner keeps one camera stream until explicit stop and forwards QR corner positions locally',async()=>{
 const f=scanFixture(),frames=[];const continuous=createScanner({environment:f.environment,continuous:true,onState(){},onFrame:frame=>frames.push(frame)});const pending=continuous.start(f.video);f.resolve();await pending;assert.equal(f.stopped(),0);assert.ok(frames[0].detection.location.topLeftCorner);assert.equal(f.timers.size,1);continuous.stop();assert.equal(f.stopped(),1);assert.equal(f.video.srcObject,null);assert.equal(f.timers.size,0);
});
