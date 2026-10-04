import { decodeDetection } from './markers.js';

export function createScanner({environment=globalThis,onState,onMarker=()=>{},onFrame,continuous=false,decode=decodeDetection}) {
  let generation=0,stream=null,video=null,canvas=null,timer=null;
  const emit=(status,message)=>onState({status,message});
  function release() {if(timer!==null)environment.clearTimeout(timer);timer=null;stream?.getTracks().forEach(track=>track.stop());stream=null;if(video){video.pause();video.srcObject=null;}video=null;if(canvas){canvas.width=0;canvas.height=0;}canvas=null;}
  function stop(){generation++;release();emit('idle','Camera stopped. You can open a saved card manually.');}
  async function start(target) {
    stop();const run=generation;
    if(!environment.isSecureContext||!environment.navigator?.mediaDevices?.getUserMedia){emit('unavailable','Scanning is unavailable here. Use HTTPS on a compatible camera device, or open a saved card.');return;}
    video=target;emit('starting','Respond to your browser’s camera request. No microphone is requested.');
    try {
      const next=await environment.navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640}},audio:false});
      if(run!==generation){next.getTracks().forEach(track=>track.stop());return;}stream=next;video.srcObject=next;await video.play();if(run!==generation)return;
      canvas=environment.document.createElement('canvas');const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Camera frames cannot be read here.');
      emit('scanning','Hold the whole marker in view. Move slowly and use good light.');
      const scan=()=>{
        if(run!==generation)return;
        try {
          if(video.videoWidth&&video.videoHeight){const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);const frame=ctx.getImageData(0,0,canvas.width,canvas.height),result=decode(frame.data,frame.width,frame.height),detection=typeof result==='string'?{data:result}:result;
            if(continuous)onFrame?.({detection,width:frame.width,height:frame.height});
            else if(detection){stop();onMarker(detection.data);return;}}
          timer=environment.setTimeout(scan,250);
        }catch{generation++;release();emit('error','Scanning stopped. Try again or open the saved card manually.');}
      };scan();
    }catch(error){if(run!==generation)return;generation++;release();emit('error',error.name==='NotAllowedError'?'Camera access was declined. You can open the saved card manually.':'The camera could not start. Check that another app is not using it, or open a saved card.');}
  }
  return {start,stop};
}
