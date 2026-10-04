import { createScanner } from './scanner.js';
import { isValidCard } from './cards.js';
import { markerPayload } from './marker-data.js';
import { approvedStep,replaySteps } from './replay.js';

// Map a rectangular HTML plane onto four detected camera-image corners.
// This is marker-relative projection, not a world-space/SLAM anchor.
export function projectMarker(points,width=280,height=180) {
  if(points.length!==4||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid marker corners.');
  const source=[[0,0],[width,0],[width,height],[0,height]],rows=[];
  source.forEach(([x,y],i)=>{const {x:u,y:v}=points[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
  for(let i=0;i<8;i++) {let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;
    if(Math.abs(rows[pivot][i])<1e-8)throw new Error('Marker projection is degenerate.');[rows[i],rows[pivot]]=[rows[pivot],rows[i]];
    const divisor=rows[i][i];for(let k=i;k<9;k++)rows[i][k]/=divisor;
    for(let j=0;j<8;j++)if(j!==i){const factor=rows[j][i];for(let k=i;k<9;k++)rows[j][k]-=factor*rows[i][k];}}
  const h=rows.map(row=>row[8]);return [h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1];
}
export function createMarkerAR({environment=globalThis,onState,scannerFactory=createScanner}) {
  let scanner=null,stage=null,card=null,index=null,previous=null,generation=0,lastState='';
  const emit=(status,message)=>{if(lastState===status+message)return;lastState=status+message;onState({status,message,active:Boolean(stage)&&!['idle','error','unavailable'].includes(status)});};
  function hide(){if(stage)stage.querySelector('.marker-plane').hidden=true;previous=null;}
  function paint(){if(!stage||!card)return;const plane=stage.querySelector('.marker-plane');plane.querySelector('.marker-plane-title').textContent=index===null?(card.language==='es'?'TARJETA APROBADA':'APPROVED CARD'):`${card.language==='es'?'PASO':'STEP'} ${index+1} / ${replaySteps(card).length}`;
    const text=index===null?card.instruction:approvedStep(card,index).text;plane.querySelector('.marker-plane-text').textContent=text;
    plane.querySelector('.marker-plane-notice').textContent=card.translation?.pack.labels.demoNotice||'Fictional demonstration.';
    plane.querySelector('.marker-plane-text').hidden=false;
    // Preserve the complete text below instead of clipping an oversized projected plane.
    if(plane.scrollHeight>180){plane.querySelector('.marker-plane-text').hidden=true;plane.querySelector('.marker-plane-notice').textContent=(card.translation?.pack.labels.demoNotice||'Fictional demonstration.')+' '+(card.language==='es'?'Lea las palabras aprobadas debajo de la cámara.':'Read the complete approved words below the camera.');}}
  function stop(){generation++;scanner?.stop();scanner=null;hide();if(stage)stage.hidden=true;stage=null;card=null;index=null;lastState='';emit('idle','Marker camera is off. Approved text remains available.');}
  function start(snapshot,target,stepIndex=null) {
    stop();if(!isValidCard(snapshot)||!markerPayload(snapshot)){emit('unavailable','Save this approved card before using its replay marker.');return;}
    if(stepIndex!==null)approvedStep(snapshot,stepIndex);
    card=structuredClone(snapshot);stage=target;index=stepIndex;stage.hidden=false;paint();const run=generation;
    scanner=scannerFactory({environment,continuous:true,onState:state=>{if(run!==generation)return;if(['error','unavailable'].includes(state.status)){hide();stage.hidden=true;emit(state.status,state.message);}else if(state.status!=='idle')emit(state.status,state.message);},onFrame:({detection,width,height})=>{
      if(run!==generation||!stage)return;
      if(!detection||detection.data!==markerPayload(card)||!detection.location){hide();emit('searching',detection?'This is a different marker. Keep this card’s own marker in view.':'Marker not in view. The camera overlay is hidden; keep the printed marker visible.');return;}
      try {
        const video=stage.querySelector('video'),box=video.getBoundingClientRect(),scale=Math.min(box.width/width,box.height/height),offsetX=(box.width-width*scale)/2,offsetY=(box.height-height*scale)/2;
        const l=detection.location,raw=[l.topLeftCorner,l.topRightCorner,l.bottomRightCorner,l.bottomLeftCorner].map(p=>({x:offsetX+p.x*scale,y:offsetY+p.y*scale}));
        const center={x:raw.reduce((sum,p)=>sum+p.x,0)/4,y:raw.reduce((sum,p)=>sum+p.y,0)/4};
        // Expand the marker's quadrilateral so the words remain readable near the paper card.
        let points=raw.map(p=>({x:center.x+(p.x-center.x)*2.2,y:center.y+(p.y-center.y)*1.5}));
        if(previous)points=points.map((p,i)=>({x:previous[i].x*.45+p.x*.55,y:previous[i].y*.45+p.y*.55}));previous=points;
        const plane=stage.querySelector('.marker-plane');plane.style.transform=`matrix3d(${projectMarker(points).join(',')})`;plane.hidden=false;paint();
        emit('tracking','Matching marker tracked. The approved step follows it in the camera image. Keep the whole marker visible.');
      }catch{hide();emit('searching','Marker projection paused. Move slowly; the approved words remain below.');}
    }});
    scanner.start(stage.querySelector('video'));
  }
  function setStep(next){if(!card)return;if(next!==null)approvedStep(card,next);index=next;paint();}
  return {start,stop,setStep};
}
