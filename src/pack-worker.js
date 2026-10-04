import { importPack, exportPack, installOnline, withPackLock, cleanStaging } from './model-pack.js';
let cancelled=false,active=false,stage=null,abort=null;
self.onmessage=async({data})=>{
  if(data.type==='cancel'){cancelled=true;abort?.abort();return;}
  if(active)return;active=true;cancelled=false;abort=new AbortController();
  const check=()=>{if(cancelled)throw new Error('Transfer cancelled. Existing installed files are unchanged.');};
  let last=0;
  const options={check,signal:abort.signal,onStage:name=>{stage=name;self.postMessage({type:'stage',name});},onProgress:(received,total,path)=>{if(Date.now()-last>250){last=Date.now();self.postMessage({type:'progress',message:`Checking ${path}: ${(received/1e6).toFixed(1)} / ${(total/1e6).toFixed(1)} MB`});}}};
  try {
    const result=await withPackLock(()=>data.type==='import'?importPack(data.file,options):data.type==='export'?exportPack(options):data.type==='install'?installOnline(options):Promise.reject(new Error('Unsupported pack action.')));
    check();self.postMessage({type:'done',result,action:data.type});
  }catch(error){self.postMessage({type:'error',message:cancelled?'Transfer cancelled.':error.message||'The pack could not be transferred. Existing installed files remain available.'});}
  finally{if(stage)await cleanStaging(stage);self.close();}
};
