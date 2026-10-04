import {cardRepository} from '../src/storage.js';
import {cardFromVisit,isValidCard} from '../src/cards.js';
import {createVisit,editInstruction,setStructuredHandoff,confirmVisit,selectLanguage,confirmPatientText,setReturnTemplate} from '../src/visit.js';
import {createHandoff,editHandoff} from '../src/handoff.js';
import {setPermission} from '../src/consent.js';
import {bindReplayMarker,markerPayload} from '../src/marker-data.js';
import {markerMatrix,decodeMarker} from '../src/markers.js';
try {
 const state=await cardRepository.inspect();if(state.configured)await cardRepository.unlock('Disposable QA phrase 12345');else await cardRepository.setup('Disposable QA phrase 12345');
 let en=editInstruction(createVisit(),'Return on 2026-10-06 to the clinic. Bring your letter.');let h=createHandoff(en.revision,'return');for(const [key,value] of Object.entries({action:'Return',date:'2026-10-06',place:'the clinic',item:'your letter'}))h=editHandoff(h,key,{value,state:'confirmed'});en=setStructuredHandoff(en,h);en=confirmPatientText(selectLanguage(confirmVisit(en,true),'en'),true);
 const pack=await(await fetch('/packs/es-return-visit-v1.1.json')).json();const es=confirmPatientText(selectLanguage(confirmVisit(setReturnTemplate(createVisit(),{id:'return-visit-v1',date:'2026-10-06',location:'community-clinic'}),true),'es',pack),true);
 const cards=[en,es].map(v=>bindReplayMarker(cardFromVisit(setPermission(v,'storage','granted'))));for(const c of cards){if(!isValidCard(c))throw new Error('Invalid fixture');await cardRepository.save(c);}
 const payload=markerPayload(cards[0]),matrix=markerMatrix(payload),canvas=document.createElement('canvas');canvas.width=canvas.height=(matrix.length+8)*6;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='black';matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)ctx.fillRect((x+4)*6,(y+4)*6,6,6);}));const frame=ctx.getImageData(0,0,canvas.width,canvas.height);if(decodeMarker(frame.data,frame.width,frame.height)!==payload)throw new Error('Browser QR roundtrip failed');cardRepository.lock();
 document.querySelector('#results').textContent='PASS browser QR roundtrip and encrypted fixture save\nQA passphrase: Disposable QA phrase 12345\nEnglish reference: '+markerPayload(cards[0])+'\nSpanish reference: '+markerPayload(cards[1]);
}catch(error){document.querySelector('#results').textContent='FAIL '+error.message;}
