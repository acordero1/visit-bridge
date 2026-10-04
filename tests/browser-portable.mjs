import { cardRepository } from '../src/storage.js';
import { createVisit,editInstruction,confirmVisit,selectLanguage,confirmPatientText,setReturnTemplate,markUnderstanding } from '../src/visit.js';
import { cardFromVisit } from '../src/cards.js';
import { setPermission } from '../src/consent.js';
const result=document.querySelector('#results');
try {
 const state=await cardRepository.inspect();if(state.configured)await cardRepository.unlock('Disposable QA phrase 12345');else await cardRepository.setup('Disposable QA phrase 12345');
 const en=markUnderstanding(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),'Return to the clinic on Tuesday.\nBring your appointment letter.'),true),'en'),true),'needs-follow-up');
 const pack=await (await fetch('/packs/es-return-visit-v1.1.json')).json();
 const es=markUnderstanding(confirmPatientText(selectLanguage(confirmVisit(setReturnTemplate(createVisit(),{id:'return-visit-v1',date:'2026-10-06',location:'community-clinic'}),true),'es',pack),true),'understood');
 await cardRepository.save(cardFromVisit(setPermission(en,'storage','granted')));await cardRepository.save(cardFromVisit(setPermission(es,'storage','granted')));cardRepository.lock();
 result.textContent='Synthetic English and Spanish approved cards ready.\nQA passphrase: Disposable QA phrase 12345\nNo actual patient data.';
}catch(e){result.textContent='FAIL '+e.message;}
