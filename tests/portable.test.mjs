import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cardFromVisit } from '../src/cards.js';
import { createVisit,editInstruction,confirmVisit,selectLanguage,confirmPatientText,setReturnTemplate } from '../src/visit.js';
import { patientCopy,patientCopyHTML,portableStamp } from '../src/portable-card.js';
const approved=text=>cardFromVisit(confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(),text),true),'en'),true));
test('portable copy preserves all approved text but omits original drafts, observations, identity and permission record',()=>{
 const card=approved('Return Tuesday.\nBring your appointment letter.'),copy=patientCopy(card);card.originalInstruction='Internal original note';card.modelDraft={text:'Internal rejected suggestion',revision:card.revision,language:'en',model:'test',modelRevision:'pinned'};card.patientName='PRIVATE';
 const html=patientCopyHTML(card);assert.equal(copy.lines.map(l=>l.text).join('\n'),card.instruction);assert.equal(copy.text,card.instruction);
 for(const privateText of ['Internal original','Internal rejected','PRIVATE',card.id,'permission','understanding'])assert.equal(html.includes(privateText),false);
 assert.equal(html.includes('<script'),false);assert.equal(html.includes('https://'),false);assert.ok(html.includes("default-src 'none'"));
 assert.throws(()=>patientCopy({...card,approvedRevision:null}));
});
test('HTML remains inert for malicious text and long approved words are not truncated',()=>{
 const text='<img src=x onerror=alert(1)>\n'+('x'.repeat(500)),card=approved(text),html=patientCopyHTML(card);
 assert.ok(html.includes('&lt;img'));assert.equal(html.includes('<img'),false);assert.ok(html.includes('x'.repeat(500)));assert.ok(html.includes('overflow-wrap:anywhere'));
 assert.notEqual(portableStamp(card),portableStamp({...card,instruction:'changed'}));
});
test('Spanish portable copy retains exact date, clinic, approved snapshot and demonstration notice',async()=>{
 const pack=JSON.parse(await readFile(new URL('../packs/es-return-visit-v1.1.json',import.meta.url))),card=cardFromVisit(confirmPatientText(selectLanguage(confirmVisit(setReturnTemplate(createVisit(),{id:'return-visit-v1',date:'2026-10-06',location:'community-clinic'}),true),'es',pack),true));
 const copy=patientCopy(card),html=patientCopyHTML(card);assert.ok(html.includes('lang="es"'));assert.ok(html.includes('2026-10-06'));assert.ok(html.includes('la clínica comunitaria'));assert.ok(html.includes(pack.labels.demoNotice));assert.equal(copy.text,card.instruction);
});
