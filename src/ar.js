import { approvedStep } from './replay.js';
import { isValidCard } from './cards.js';
import { createARRenderer, placementMatrix } from './ar-renderer.js';

export function createARController({environment=globalThis,onState,rendererFactory=createARRenderer}) {
  let generation=0, session=null, source=null, renderer=null, point=null, candidate=null, yaw=0, width=.55;
  let activeCard=null;
  let reference=null, status='idle';
  function emit(next,message){if(status===next&&message===emit.last)return;status=next;emit.last=message;onState({status,message,active:Boolean(session),canPlace:Boolean(candidate)&&!point,placed:Boolean(point)});}
  function cleanup(){try{source?.cancel();}catch{/* The source may already be cancelled. */}source=null;try{renderer?.dispose();}catch{/* Continue ending the session even if graphics cleanup fails. */}renderer=null;activeCard=null;session=null;reference=null;point=null;candidate=null;width=.55;yaw=0;}
  async function stop(){generation++;const old=session;cleanup();emit('idle','AR closed. Your approved card is available below.');try{await old?.end();}catch{/* Session may already be closed. */}}
  async function check(){const run=++generation;
    if(!environment.isSecureContext||!environment.navigator?.xr){emit('unavailable','Spatial AR is unavailable here. Use the regular care card, or open this app on a compatible AR phone over HTTPS.');return;}
    emit('checking','Checking spatial AR support…');
    try {const supported=await environment.navigator.xr.isSessionSupported('immersive-ar');if(run!==generation)return;emit(supported?'ready':'unavailable',supported?'Ready. Start AR to request access to your surroundings.':'This device does not support spatial AR. The regular care card is available.');}catch{if(run===generation)emit('unavailable','AR support could not be checked. The regular care card is available.');}
  }
  async function start(card,overlay,stepIndex=null){
    if(session||status==='starting')return;
    if(!isValidCard(card)){emit('error','Only an approved care card can be shown in AR.');return;}
    if(stepIndex!==null){try{approvedStep(card,stepIndex);}catch{emit('error','Choose an approved replay step.');return;}}
    const snapshot=structuredClone(card),run=++generation;
    if(!environment.isSecureContext||!environment.navigator?.xr){emit('unavailable','Spatial AR is unavailable here. The regular care card is available.');return;}
    emit('starting','Starting AR. Respond to your browser’s access prompt.');
    try {
      // Request directly from the Start AR gesture; discovery never requests access.
      const next=await environment.navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],domOverlay:{root:overlay}});
      if(run!==generation){await next.end();return;}session=next;
      session.addEventListener('end',()=>{if(run!==generation)return;generation++;cleanup();emit('idle','AR ended. Your approved card is available below.');});
      session.addEventListener('visibilitychange',()=>{if(session?.visibilityState==='hidden')stop();});
      reference=await session.requestReferenceSpace('local');if(run!==generation)return;
      const viewer=await session.requestReferenceSpace('viewer');if(run!==generation)return;
      const hit=await session.requestHitTestSource({space:viewer});if(run!==generation){hit.cancel();return;}source=hit;
      renderer=rendererFactory(session,snapshot,environment);activeCard=snapshot;
      if(stepIndex!==null)renderer.setStep?.(stepIndex);
      session.addEventListener('select',place);
      emit('scanning','Move your phone slowly over a clear surface.');
      const frame=(_,xrFrame)=>{
        if(run!==generation||!session)return;
        try {
          const pose=xrFrame.getViewerPose(reference);
          if(!pose){candidate=null;renderer.draw(null,null,false);emit('tracking','Tracking paused. Move slowly until the view returns.');}
          else {
            const hitPose=!point?xrFrame.getHitTestResults(source)[0]?.getPose(reference):null;
            candidate=hitPose?[hitPose.transform.position.x,hitPose.transform.position.y,hitPose.transform.position.z]:null;
            if(candidate){const camera=pose.transform.position;yaw=Math.atan2(camera.x-candidate[0],camera.z-candidate[2]);}
            const position=point||candidate;
            renderer.draw(pose,position?placementMatrix(position,yaw,width):null,Boolean(point));
            emit(point?'placed':candidate?'surface':'scanning',point?'Card placed. Move around it or reposition it.':candidate?'Surface found. Tap Place card to keep it here.':'Move your phone slowly over a clear surface.');
          }
          session?.requestAnimationFrame(frame);
        } catch {const old=session;generation++;cleanup();emit('error','AR rendering stopped. Your regular care card is available.');old?.end().catch(()=>{});}
      };
      session.requestAnimationFrame(frame);
    } catch(problem) {if(run!==generation)return;const old=session;generation++;cleanup();emit('error',problem.name==='NotAllowedError'?'AR access was declined. Your regular care card is available.':'This device could not start surface AR. Your regular care card is available.');try{await old?.end();}catch{/* Already ended. */}}
  }
  function place(){if(!session||point||!candidate)return;point=[...candidate];candidate=null;emit('placed','Card placed. Move around it or reposition it.');}
  function reposition(){if(!session)return;point=null;candidate=null;emit('scanning','Find a new surface and tap Place card.');}
  function resize(delta){if(!point)return;width=Math.max(.3,Math.min(1,width+delta));}
  function rotate(delta){if(point)yaw+=delta;}
  function setStep(index=null){if(!renderer||!activeCard)return;try{if(index!==null)approvedStep(activeCard,index);renderer.setStep(index);}catch{stop();emit('error','This step could not be rendered. Use the readable card.');}}
  return {check,start,stop,place,reposition,resize,rotate,setStep,isActive:()=>Boolean(session)||status==='starting'};
}
