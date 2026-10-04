export function createPackController({onState,onExport,onInstalled,environment=globalThis}) {
  let worker=null,generation=0,busy=false;
  const publish=(status,message)=>onState({status,message,busy});
  function cancel(){if(!worker&&!busy)return;generation++;busy=false;if(worker){const previous=worker;worker=null;previous.postMessage({type:'cancel'});}publish('idle','Pack transfer stopped. Check device readiness before trying again.');}
  function start(type,file){
    if(busy)return;const token=++generation;busy=true;
    try{worker=new environment.Worker(new URL('./pack-worker.js',import.meta.url),{type:'module'});}
    catch{busy=false;publish('error','This browser cannot transfer a model pack. Typed input remains available.');return;}
    const current=worker;publish(type==='export'?'exporting':type==='import'?'importing':'installing',type==='export'?'Verifying public files before export…':type==='import'?'Checking the selected offline pack…':'Checking or downloading the pinned public model files…');
    current.onmessage=({data})=>{
      if(token!==generation)return;
      if(data.type==='progress')publish(type==='export'?'exporting':type==='import'?'importing':'installing',data.message);
      if(data.type==='error'){busy=false;worker=null;publish('error',data.message);onInstalled();}
      if(data.type==='done') {busy=false;worker=null;publish('complete',data.action==='export'?'Verified model pack handed to your browser for download.':data.result.reused?'Pack verified. The matching installed pack was retained.':'Verified model pack installed on this device.');if(data.action==='export')onExport(data.result);else onInstalled();}
    };
    current.onerror=()=>{if(token!==generation)return;busy=false;worker=null;current.terminate();publish('error','Pack transfer stopped unexpectedly. Previous installation is retained; incomplete staging files may require cleanup.');onInstalled();};
    current.postMessage({type,file});
  }
  return {cancel,install:()=>start('install'),import:file=>start('import',file),export:()=>start('export'),isBusy:()=>busy};
}
