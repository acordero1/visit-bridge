import { createScanner } from './scanner.js';
import { resolveMarker } from './markers.js';
import { markerPayload } from './marker-data.js';
import { approvedContentStamp } from './understanding.js';

const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function createScanView({root,repository,isUnlocked,onOpen,onLock,onClose,environment=globalThis}) {
  let overlay=null,found=null,generation=0;
  const status=message=>{if(overlay)overlay.querySelector('#scan-status').textContent=message;};
  const scanner=createScanner({environment,onState:state=>{
    status(state.message);if(overlay){overlay.querySelector('[data-scan="start"]').disabled=['starting','scanning'].includes(state.status);overlay.querySelector('[data-scan="stop"]').disabled=!['starting','scanning'].includes(state.status);}
  },onMarker:lookup});
  async function lookup(payload) {
    scanner.stop();found=null;const run=++generation;
    if(!overlay||!isUnlocked())return;
    overlay.querySelector('#scan-match').innerHTML='';status('Looking for this approved copy in the unlocked device vault…');
    try {
      const card=resolveMarker(payload,await repository.list());if(run!==generation||!overlay||!isUnlocked())return;found=card;
      overlay.querySelector('#scan-match').innerHTML=`<article class="scan-match" lang="${card.language}"><h3>Approved card found · ${card.language==='es'?'Español':'English'}</h3>${card.translation?`<p class="translation-notice">${escape(card.translation.pack.labels.demoNotice)}</p>`:''}<p class="instruction-text">${escape(card.instruction)}</p><p>Prepared ${escape(new Date(card.patientApprovedAt||card.confirmedAt).toLocaleString())}. Compare these words with the paper card before continuing.</p><button class="button primary" data-scan="open">Open approved replay</button></article>`;
      status('Matching local card found. The camera is stopped. Nothing has been spoken or opened in AR yet.');
    }catch(error){if(run===generation&&overlay)status(error.message||'This card could not be opened. No other card was selected.');}
  }
  async function accept() {
    if(!found||!overlay||!isUnlocked())return;
    const snapshot=found,run=++generation;status('Rechecking the saved approval…');
    try {
      const current=resolveMarker(markerPayload(snapshot),await repository.list());if(run!==generation||!overlay||!isUnlocked())return;
      if(approvedContentStamp(current)!==approvedContentStamp(snapshot))throw new Error('This saved card changed. Scan its current marker again.');
      close();onOpen(current);
    }catch(error){if(run===generation&&overlay){found=null;overlay.querySelector('#scan-match').innerHTML='';status(error.message||'The saved card is unavailable. Scan again.');}}
  }
  function close() {const wasOpen=Boolean(overlay);generation++;scanner.stop();found=null;overlay?.remove();overlay=null;if(wasOpen){root.inert=false;onClose?.();}}
  function open() {
    if(overlay||!isUnlocked())return;
    overlay=environment.document.createElement('section');overlay.className='scan-dialog';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','scan-heading');
    overlay.innerHTML=`<div class="scan-content"><header class="scan-toolbar"><h2 id="scan-heading">Scan a care card</h2><button class="button secondary" data-scan="lock">Lock now</button><button class="button secondary" data-scan="close">Back to workspace</button></header><p>Use the device that saved this card. Its marker contains a random local reference. Other devices cannot retrieve the card from it.</p><p>Start camera requests camera access only. Frames are processed on this device and are not recorded, saved or sent. Use fictional cards.</p><video id="scan-video" muted playsinline aria-label="Care-card camera preview"></video><div class="form-actions"><button class="button primary" data-scan="start">Start camera</button><button class="button secondary" data-scan="stop" disabled>Stop camera</button></div><p id="scan-status" role="status" aria-live="polite">Camera is off. You can also enter the reference printed below the marker.</p><form id="scan-reference-form"><label for="scan-reference">Printed replay reference</label><input id="scan-reference" autocomplete="off" spellcheck="false" maxlength="36" placeholder="VB1: followed by 32 characters"><button class="button secondary" type="submit">Find saved card</button></form><div id="scan-match"></div><small>If no card matches, open Saved cards manually. This scanner does not navigate to QR links or retrieve a card from the internet.</small></div>`;
    overlay.addEventListener('click',event=>{const action=event.target.closest('[data-scan]')?.dataset.scan;if(!action)return;event.preventDefault();if(action==='close')close();if(action==='lock')onLock();if(action==='stop')scanner.stop();if(action==='start'){generation++;found=null;overlay.querySelector('#scan-match').innerHTML='';scanner.start(overlay.querySelector('#scan-video'));}if(action==='open')accept();});
    overlay.addEventListener('submit',event=>{event.preventDefault();lookup(overlay.querySelector('#scan-reference').value.trim());});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key==='Tab'){const controls=[...overlay.querySelectorAll('button:not(:disabled),input')];if(event.shiftKey&&environment.document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}else if(!event.shiftKey&&environment.document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}}});
    environment.document.body.append(overlay);root.inert=true;overlay.querySelector('[data-scan="close"]').focus();
  }
  return {open,close};
}
