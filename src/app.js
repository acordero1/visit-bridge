import { currentUnderstanding, saveStamp, patientLines } from './understanding.js';
import { FIELD_LABELS, FIELD_STATES, WORKFLOWS, createHandoff, templateHandoff, editHandoff, changeWorkflow, handoffIssues, handoffText, spanishHandoffSupported, extractionScopeIssue } from './handoff.js';
import { createVisit, editInstruction, instructionError, selectLanguage, confirmVisit,
  patientInstruction, canShare, setPatientText, confirmPatientText, setReturnTemplate, approvedPlanText, setStructuredHandoff, markUnderstanding, MAX_INSTRUCTION_LENGTH } from './visit.js';

import { saveApprovedCard, cardFromVisit, isValidCard } from './cards.js';
import { cardRepository } from './storage.js';
import { initializeOffline } from './offline.js';
import { createSpeechController } from './speech.js';
import { createModelController } from './model.js';
import { TEMPLATE_ID, validTemplate } from './templates.js';
import { loadLanguagePack, installLanguagePack } from './language-packs.js';
import { createARController } from './ar.js';
import { createPlaybackController } from './playback.js';
let playbackState = { status: 'checking', message: 'Checking for a local English voice…', available: false, voiceName: '' };
let modelState = { status: 'checking', message: 'Checking local AI availability…', installed: false };
let patientConfirmed = false;
let templateMode = false;
let templateDate = '';
let templateLocation = 'clinic';
let spanishPack = null;
let packStatus = 'checking';
let packError = '';
let rejectedDraft = null;
let extractionProposal = null;
let extractionError = '';
let rejectedExtractionText = '';
let reviewMode = 'structured';
let structuredBackup = null;
let evidenceKey = null;
let arOverlay = null;
let arSnapshot = null;
let arState = { status: 'idle', message: '', active: false, canPlace: false, placed: false };

const root = document.querySelector('#app');
let visit = null;
let screen = 'home';
let error = '';
let confirmed = false;
let discardOpen = false;
let cards = [];
let selectedCard = null;
let deleteId = null;
let storageError = '';
let cardsLoading = true;
let saving = false;
let deleting = false;
let saveError = '';
let savedRevision = null;
let offline = { ready: false, unsupported: false, error: false, updateAvailable: false };
let installPrompt = null;
let captureMode = 'type';
let speechState = { status: 'idle', message: 'Checking on-device English dictation…', interim: '', canDiscard: false };
let previousSpeechStatus = 'idle';
const dateLabel = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const icons = {
  action: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  place: '<path d="M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13Z"/><circle cx="12" cy="9" r="2"/>',
  date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  item: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 7V3h8v4"/>',
  task: '<path d="M9 6h12M9 12h12M9 18h12m-18-12 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2"/>',
  bridge: '<path d="M3 17v-5a9 9 0 0 1 18 0v5M3 14h18M8 14v7m8-7v7"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6m-6 4h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  speaker: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  wifi: '<path d="M3 7a15 15 0 0 1 18 0M6 11a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h5m-5 4h9m2-4h1"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
const button = (label, action, secondary = false) => `<button class="button ${secondary ? 'secondary' : 'primary'}" data-action="${action}">${label}${!secondary ? icon('arrow') : ''}</button>`;
const steps = ['Capture', 'Review', 'Handoff'];

function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="#" data-action="home">${icon('bridge')}<span>Visit Bridge<small>CARE THAT CARRIES ON</small></span></a>
    <div class="workspace-label">WORKER WORKSPACE</div>
    <button class="nav-item ${screen === 'home' ? 'active' : ''}" data-action="home">${icon('home')}Overview</button>
    <button class="nav-item ${['capture','review','handoff','complete'].includes(screen) ? 'active' : ''}" data-action="resume">${icon('note')}${visit ? 'Current visit' : 'New visit'}${visit ? '<span class="nav-dot"></span>' : ''}</button>
    <button class="nav-item ${['saved','savedCard'].includes(screen) ? 'active' : ''}" data-action="saved">${icon('card')}Saved cards<span class="nav-count" id="saved-count">${cards.length}</span></button>
    <div class="sidebar-note">${icon('bridge')}<p>A clear next step.<br>A little more confidence.<br>Care that carries on.</p></div>
    <div class="sidebar-footer"><span class="avatar">HW</span><span>Health worker<small>Demo workspace</small></span></div></aside>`;
}


function understandingPanel(record, editable) {
  const observation = currentUnderstanding(record);
  const labels = { understood: 'Understood · worker observed repeat-back', clarified: 'Clarified · explanation repeated; understanding not confirmed', 'needs-follow-up': 'Needs follow-up · next step remains unresolved' };
  const es = record.language === 'es';
  const prompt = es ? record.translation?.pack.labels.teachBack : 'To check that I explained it clearly, please tell me in your own words what you will do next, and when or where you will do it.';
  return `<section class="understanding-panel" aria-labelledby="understanding-heading"><span class="eyebrow">WORKER CHECK</span><h2 id="understanding-heading">Check the next step together</h2>
    ${editable ? `<p>Ask the patient or caregiver to explain the approved next step in their own words. Check the action and each relevant date, time, place or item on the card.</p><blockquote lang="${record.language}">${escape(prompt || 'Spanish prompt unavailable in this older pack. Ask in a language you and the patient understand; do not imply a validated translation.')}</blockquote>${es ? '<p class="translation-notice">Spanish prompt is an unvalidated demonstration. Use fictional information.</p>' : ''}<p>Read together or use the card’s replay controls. If the plan or wording changes, return to review and approve it again.</p>` : ''}
    <p id="understanding-summary" tabindex="-1" role="status" aria-live="polite"><strong>${escape(observation ? labels[observation.result] : 'Understanding check not recorded')}</strong>${observation ? `<br><small>Marked ${escape(dateLabel(observation.markedAt))} for this exact approved copy.</small>` : ''}</p>
    ${editable ? `<div class="understanding-actions" role="group" aria-label="Record worker observation">${[['understood','Understood'],['clarified','Clarified'],['needs-follow-up','Needs follow-up']].map(([result,label]) => `<button type="button" class="button secondary" data-action="mark-understanding" data-result="${result}" aria-pressed="${observation?.result === result}">${label}</button>`).join('')}</div><p class="field-help">Understood: the patient described the key step correctly. Clarified: you explained again; a successful repeat-back has not been marked. Needs follow-up: further human attention is needed.</p>${observation ? '<button type="button" class="text-button" data-action="clear-understanding">Clear this observation and ask again</button>' : ''}` : ''}
    <small>This is a worker observation, not an automated score. The patient’s answer and voice are not recorded. Saving without a check keeps “not recorded”; needs-follow-up cards can also be saved.</small></section>`;
}
function readinessPanel() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const localVoice = code => voices.some(v => v.localService === true && String(v.lang).replace('_','-').toLowerCase().split('-')[0] === code);
  const entries = [
    ['Offline app', offline.ready ? 'Cached and ready on this origin' : offline.error || offline.unsupported ? 'Offline loading unavailable' : 'Checking app cache'],
    ['English typed input', 'Available · no optional pack needed'],
    ['English dictation', ['ready','review'].includes(speechState.status) ? 'Local pack available · microphone starts only when requested' : speechState.message],
    ['Local AI', modelState.status === 'unsupported' || modelState.status === 'error' ? modelState.message : modelState.installed ? 'Pack installed · device performance still needs validation' : modelState.status === 'checking' ? 'Checking local files' : 'Not installed · optional download about 207 MB'],
    ['Spanish patient text', spanishPack ? `Installed ${spanishPack.version} · return-date-and-clinic template only · unvalidated` : packError || (packStatus === 'checking' ? 'Checking local pack' : 'Not installed · English remains available')],
    ['Local read-aloud', `English: ${localVoice('en') ? 'voice reported by browser' : 'no matching local voice reported'}; Spanish: ${localVoice('es') ? 'voice reported by browser' : 'no matching local voice reported'}. Speaker output and offline behavior require device testing.`]
  ];
  return `<h2>Ready on this device?</h2><p>App, AI, speech and patient-language availability are checked separately. No packs download automatically.</p><dl class="readiness-list">${entries.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><button type="button" class="button secondary" data-action="check-readiness">Check availability again</button>`;
}
function updateReadiness() { const panel = root.querySelector('#home-readiness'); if (panel) panel.innerHTML = readinessPanel(); }

function home() {
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow">THE VISIT ENDS. THE CARE CONTINUES.</span>
    <h1 tabindex="-1">A clear next step.<br>For every patient.</h1><p>Turn the next step you’ve chosen into a simple handoff your patient can take with them.</p>
    ${button(visit ? 'Continue current visit' : 'Start a visit', visit ? 'resume' : 'start')}<div class="hero-footnote">${icon('shield')}Your decision. Your review. Their next step.</div></div>
    <div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-badge">${icon('check')}Worker confirmed</div><div class="example-card"><div class="card-logo">${icon('bridge')}VISIT BRIDGE</div><span class="card-eyebrow">EXAMPLE HANDOFF</span><h2>Your next step</h2><p>Return to the clinic<br>on Tuesday.</p><div class="card-rule"></div><div class="example-meta">A reminder from your health worker<span>English · Read</span></div></div><div class="art-caption">Small instructions.<br>Meaningful connections.</div></div></section>
    <section id="home-readiness" class="readiness-panel" aria-label="Device readiness">${readinessPanel()}</section><section class="device-panel"><div><span class="eyebrow">CARE CARDS ON THIS DEVICE</span><h2>Keep the next step close.</h2><p>Save a reviewed card and reopen it here when connectivity drops. Use fictional demo information only.</p></div><div class="device-actions">${button('Open saved cards','saved',true)}<div id="install-control"></div></div></section>
    <div class="section-heading"><h2>A handoff in three simple steps</h2><span>Designed around the worker’s decision</span></div>
    <section class="how-grid">${[
      ['01','note','Capture the next step','Type or dictate the instruction you have already chosen for your patient.'],
      ['02','shield','Review with confidence','Check the wording and confirm it before preparing the handoff.'],
      ['03','card','Make it easy to remember','Open a simple, readable care card on the device you already use.'],
    ].map(([number, name, title, copy]) => `<article class="how-card"><div class="how-top"><span class="icon-tile">${icon(name)}</span><span class="step-number">${number}</span></div><h3>${title}</h3><p>${copy}</p></article>`).join('')}</section>
    <section class="scope-strip">${icon('shield')}<div><strong>Communication support, with the worker in control.</strong><p>Visit Bridge helps communicate a plan you have already decided. It does not diagnose, prescribe, or choose treatment.</p></div><span class="scope-tag">FOUNDATION DEMO</span></section>
    <section class="roadmap"><span>Coming in later build phases</span><div><span>${icon('globe')}Validated patient translations</span><span>${icon('globe')}Additional language packs</span><span>${icon('card')}Care-card export</span></div></section>`;
}

function progress(active) {
  return `<ol class="progress" aria-label="Visit progress">${steps.map((name, index) => `<li ${active === index ? 'aria-current="step"' : ''} class="${index < active ? 'done' : ''} ${index === active ? 'current' : ''}"><span>${index < active ? icon('check') : index + 1}</span>${name}</li>`).join('')}</ol>`;
}

function formLayout(active, title, subtitle, content, aside) {
  return `<div class="flow-heading"><span class="eyebrow">CURRENT VISIT · DEMO</span><button class="text-button" data-action="cancel">Cancel visit</button></div>${progress(active)}<div class="flow-title"><h1 tabindex="-1" id="page-heading">${title}</h1><p>${subtitle}</p></div><div class="flow-grid"><section class="form-panel">${error ? `<div class="error" role="alert">${escape(error)}</div>` : ''}${content}</section><aside class="helper-panel">${aside}<div class="privacy-note">${icon('shield')}<p>Use sample information only. This draft stays in memory and is cleared when you reload or close this page.</p></div></aside></div>`;
}

function capture() {
  return formLayout(0, 'What is the next step?', 'Record the instruction you have already chosen for this patient.',
    `<form id="capture-form"><div class="input-language"><strong>Worker input language: English</strong><p>Type in English or use local English dictation when available. Spanish is a limited patient-output template, not Spanish dictation or general translation.</p></div>${templateMode ? `<section class="voice-panel"><strong>Return-visit template</strong><p>Choose the date and clinic from the plan you already decided. This exact template supports the Spanish demo.</p><label for="return-date">Return date</label><input id="return-date" type="date" value="${escape(templateDate)}" min="2000-01-01" max="2099-12-31" required><label for="return-location">Return location</label><select id="return-location"><option value="clinic" ${templateLocation === "clinic" ? "selected" : ""}>The clinic</option><option value="community-clinic" ${templateLocation === "community-clinic" ? "selected" : ""}>The community clinic</option></select><button type="button" class="text-button" data-action="free-text">Write a different instruction</button></section>` : `<div id="voice-controls">${voiceControls()}</div><button type="button" class="button secondary" data-action="return-template">Use a return-visit template</button>`}<label for="instruction">Your instruction <span>Required</span></label><p class="field-help" id="instruction-help">Use clear, specific wording. Leave out patient names and other identifying details.</p><textarea id="instruction" ${templateMode ? "readonly" : ""} name="instruction" rows="7" maxlength="${MAX_INSTRUCTION_LENGTH}" aria-describedby="instruction-help character-count" placeholder="For example: Return to the clinic on Tuesday." required>${escape(visit.originalInstruction)}</textarea><div class="input-meta"><span>${icon('note')}Written by the health worker</span><span id="character-count">${visit.originalInstruction.length} / ${MAX_INSTRUCTION_LENGTH}</span></div>${templateMode ? "" : '<button type="button" class="sample-button" data-action="sample">Try a sample instruction</button>'}<div class="form-actions"><button type="button" class="button secondary" data-action="home">Back to overview</button><button class="button primary" type="submit">Review instruction${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('note')}</span><h2>Start with your decision.</h2><p>Capture the next step in your own words. You’ll review it before your patient sees it.</p><div class="helper-example"><span>EXAMPLE</span><p>“Return to the clinic on Tuesday.”</p></div><p class="future-note">English dictation runs on-device where supported. You can always type instead.</p>`);
}

const stateLabel = state => ({ 'needs-review': 'Needs review', confirmed: 'Confirmed', unclear: 'Unclear', missing: 'Missing', 'not-needed': 'Not needed', 'not-specified': 'Not specified' })[state];
function sourceEvidence() {
  const evidence = visit.handoff?.fields[evidenceKey]?.evidence;
  const source = visit.originalInstruction;
  return evidence ? `${escape(source.slice(0, evidence.start))}<mark>${escape(source.slice(evidence.start, evidence.end))}</mark>${escape(source.slice(evidence.end))}` : escape(source);
}
function extractionControls() {
  const busy = ['installing','loading','generating'].includes(modelState.status);
  const scope = extractionScopeIssue(visit.originalInstruction);
  return `<strong>Organize my note · on-device AI</strong><p role="status">${escape(modelState.message)}</p>${scope ? `<p>${escape(scope)}</p>` : ''}<div class="voice-actions">${busy ? '<button type="button" class="button secondary" data-action="cancel-model">Cancel</button>' : modelState.installed ? `<button type="button" class="button secondary" data-action="extract-note" ${scope ? 'disabled' : ''}>Organize my note</button>` : `<button type="button" class="button secondary" data-action="install-model" ${['checking','unsupported'].includes(modelState.status) ? 'disabled' : ''}>Install local AI · about 207 MB</button>`}</div><small>English input. Exact source quotes only; every value still needs worker review. The form below works without AI. Schema checks cannot prove meaning.</small>`;
}
function fieldEvidence(key) {
  const field = visit.handoff.fields[key];
  return field.evidence ? `<small>${field.origin === 'model' ? 'AI proposal' : 'Template'} · source: “${escape(field.evidence.quote)}”</small><button type="button" class="text-button" data-action="inspect-evidence" data-field="${key}">Highlight in source</button>` : `<small>${field.value ? 'Added by worker · not quoted from source' : 'No detail supplied'}</small>`;
}
function structuredField(key) {
  const h = visit.handoff, f = h.fields[key];
  const fixed = key === 'action' || key === 'reported' || (key === 'date' && h.workflow === 'return') || (key === 'place' && h.workflow !== 'other');
  const issue = handoffIssues(h, visit.revision).find(message => message.startsWith(FIELD_LABELS[key]+':') || (key==='time' && message.startsWith('Time:')) || (key==='date' && message.startsWith('Calendar date:')));
  return `<section class="structured-field"><label for="detail-${key}">${escape(FIELD_LABELS[key])}${h.required[key] ? ' <span>Required</span>' : ''}</label><input id="detail-${key}" data-detail="${key}" type="${key === 'date' ? 'date' : 'text'}" ${key==='date' ? 'min="2000-01-01" max="2099-12-31"' : ''} maxlength="240" value="${escape(key==='date' && !/^20\d{2}-\d{2}-\d{2}$/.test(f.value) ? '' : f.value)}" placeholder="${key==='time' ? '09:00 or 09:00–11:00' : 'Enter the detail chosen by the worker'}" aria-describedby="evidence-${key}"><div id="evidence-${key}" class="field-evidence">${fieldEvidence(key)}</div>${key==='date' && f.value && !/^20\d{2}-\d{2}-\d{2}$/.test(f.value) ? `<p class="field-help">Unresolved source phrase: “${escape(f.value)}”. Select the intended calendar date.</p>` : ''}<div class="field-review"><label for="state-${key}">Review state</label><select id="state-${key}" data-state="${key}">${FIELD_STATES.map(state=>`<option value="${state}" ${f.state===state?'selected':''}>${stateLabel(state)}</option>`).join('')}</select>${!fixed ? `<label class="detail-required"><input type="checkbox" id="required-${key}" data-required="${key}" ${h.required[key]?'checked':''}>Required for this handoff</label>` : ''}</div>${issue ? `<p class="field-help">${escape(issue)}</p>` : ''}</section>`;
}
function issueSummary() {
  const issues = handoffIssues(visit.handoff, visit.revision);
  return `<strong>${issues.length ? `${issues.length} detail${issues.length===1?' needs':'s need'} attention` : 'Details ready for your approval'}</strong>${issues.length ? `<ul>${issues.map(issue=>`<li>${escape(issue)}</li>`).join('')}</ul>` : '<p>Compare every confirmed detail with your source and clarifications before continuing.</p>'}`;
}
function proposalPanel() {
  if (extractionError) return `<div class="error" role="alert">${escape(extractionError)} Your entered details remain available.${rejectedExtractionText ? `<details><summary>Inspect rejected model output</summary><pre class="rejected-output">${escape(rejectedExtractionText)}</pre><small>This output cannot be applied or approved.</small></details>` : ''}</div>`;
  if (!extractionProposal) return '';
  return `<section class="draft-panel"><strong>AI-organized proposal · not approved</strong><dl>${Object.entries(extractionProposal.fields).map(([key,f])=>`<dt>${escape(FIELD_LABELS[key])}</dt><dd>${f.value ? escape(f.value) : 'Not supplied'} · ${stateLabel(f.state)}</dd>`).join('')}</dl><p class="field-help">Applying this proposal replaces the current fields, including worker edits and optional requirement choices. Your source is preserved. All proposed values need review.</p><label class="check-label"><input type="checkbox" id="replace-details">I want to replace the current details with this proposal.</label><button type="button" class="button secondary" data-action="apply-extraction">Replace fields with this proposal</button><button type="button" class="text-button" data-action="discard-extraction">Discard proposal</button></section>`;
}
function review() {
  return formLayout(1, 'Organize and review the next step', 'Keep your source visible. Clarify the details the patient needs to act.',
    `<div class="source-context"><div class="panel-heading"><span class="eyebrow">YOUR ORIGINAL INSTRUCTION · ENGLISH INPUT</span><button class="text-button" data-action="edit">Edit instruction</button></div><blockquote id="review-source" class="instruction-text">${sourceEvidence()}</blockquote></div><div class="capture-modes"><button type="button" class="mode-button ${reviewMode==='structured'?'selected':''}" data-action="structured-mode">Administrative details</button><button type="button" class="mode-button ${reviewMode==='source'?'selected':''}" data-action="source-mode">Original-language review</button></div><form id="review-form">${reviewMode==='structured' ? `<label for="workflow">Administrative workflow</label><select id="workflow">${Object.entries(WORKFLOWS).map(([key,label])=>`<option value="${key}" ${visit.handoff.workflow===key?'selected':''}>${label}</option>`).join('')}</select><section id="extraction-controls" class="voice-panel">${extractionControls()}</section>${proposalPanel()}<div id="structured-issues" class="uncertainty-summary" role="status">${issueSummary()}</div><div class="structured-fields">${Object.keys(FIELD_LABELS).filter(key=>key!=='reported').map(structuredField).join('')}</div><details class="reported-details" ${visit.handoff.fields.reported.value?'open':''}><summary>Optional patient-reported information</summary><p class="field-help">Include only what is necessary. This is kept apart from the worker plan and excluded from patient instructions.</p>${structuredField('reported')}</details><label class="check-label"><input type="checkbox" id="worker-confirm" ${confirmed?'checked':''}><span>I reviewed every confirmed detail and worker clarification. This is the administrative next step I chose.</span></label>` : `<div class="review-note"><p>This path preserves your source wording and does not validate structured details or resolve ambiguity. Clarify the instruction with the patient before approving it. Use it when the administrative transformation cannot represent the source.</p></div><label class="check-label"><input type="checkbox" id="worker-confirm" ${confirmed?'checked':''}><span>I reviewed this exact source instruction and confirm it is the next step I chose for the patient.</span></label>`}<div class="form-actions">${button('Back to capture','edit',true)}<button class="button primary" type="submit">Confirm & continue${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('shield')}</span><h2>Resolve uncertainty here.</h2><div class="review-source-aside"><strong>Your source</strong><blockquote>${escape(visit.originalInstruction)}</blockquote></div><p>Choose the workflow yourself. Review each value or explicitly mark an optional detail unnecessary.</p><p>AI quotes are evidence of where words came from; you must check their meaning. A model cannot choose an appointment or referral for you.</p>`);
}
function updateStructuredUI() {
  confirmed=false; patientConfirmed=false; extractionProposal=null; extractionError=''; error=''; root.querySelector('#review-form')?.querySelector('.draft-panel')?.remove();
  root.querySelector('#worker-confirm').checked=false;
  root.querySelector('#structured-issues').innerHTML=issueSummary();
  for(const key of Object.keys(FIELD_LABELS)) {
    const state=root.querySelector(`#state-${key}`); if(state) state.value=visit.handoff.fields[key].state;
    const evidence=root.querySelector(`#evidence-${key}`); if(evidence) evidence.innerHTML=fieldEvidence(key);
  }
}
function structuredRecord(h) {
  return h ? `<h3>Structured administrative review</h3><dl class="structured-record">${Object.entries(h.fields).map(([key,f])=>`<dt>${escape(FIELD_LABELS[key])}</dt><dd>${escape(f.value || 'No value')} · ${stateLabel(f.state)} · ${f.origin==='worker' && f.value ? 'Added by worker' : escape(f.origin)}${f.evidence?`<br>Source quote: “${escape(f.evidence.quote)}”`:''}</dd>`).join('')}</dl><p>Workflow: ${escape(WORKFLOWS[h.workflow])}. Details approved ${escape(dateLabel(h.approvedAt))}. ${h.model?`Extraction model: ${escape(h.model.id)} · ${escape(h.model.revision)}.`:'Manual or template organization.'}</p>` : '<p>Original-language review only. Structured review was not recorded for this copy.</p>';
}

function aiControls() {
  const busy = ['installing','loading','generating'].includes(modelState.status);
  return `<div class="voice-heading">${icon('shield')}<strong>Optional on-device AI draft</strong><span class="voice-badge">English · local</span></div><p role="status">${escape(modelState.message)}</p><div class="voice-actions">${busy ? '<button type="button" class="button secondary" data-action="cancel-model">Cancel</button>' : modelState.installed ? `<button type="button" class="button secondary" data-action="generate-model" ${visit.language !== 'en' ? 'disabled' : ''}>Draft simpler wording</button>` : `<button type="button" class="button secondary" data-action="install-model" ${['unsupported','checking'].includes(modelState.status) ? 'disabled' : ''}>Install local AI · about 207 MB</button>`}</div><small>SmolLM2-135M runs in this browser. Installation needs internet; drafting uses cached files. A small model can lose or change meaning. Check every word before approving. Performance depends on device memory and speed.</small>`;
}
function updateAI() {
  const panel = root.querySelector('#ai-controls'); if (panel) panel.innerHTML = aiControls();
  const extraction = root.querySelector('#extraction-controls'); if(extraction) extraction.innerHTML=extractionControls();
}
function handoff() {
  return formLayout(2, 'Prepare the patient handoff', 'Keep your original instruction. Review the patient wording separately.',
    `<form id="handoff-form"><label for="language">Patient language <span>Required</span></label><p class="field-help">Ask the patient which language they prefer. Spanish is a constrained, unvalidated demonstration.</p><select id="language" required><option value="">Select a language</option><option value="en" ${visit.language === 'en' ? 'selected' : ''}>English · demo</option><option value="es" ${visit.language === "es" ? "selected" : ""} ${!spanishPack || !visit.template || !spanishHandoffSupported(visit.handoff, visit.template) ? "disabled" : ""}>Español · unvalidated demo</option></select><section id="language-pack-controls" class="voice-panel">${packControls()}</section><div class="source-panel"><span class="eyebrow">ORIGINAL · WORKER APPROVED</span><blockquote class="instruction-text">${escape(visit.originalInstruction)}</blockquote><small>Source note retained for comparison.</small>${visit.handoff ? `<div class="approved-plan"><strong>Worker-approved structured plan and clarifications</strong><p>${escape(approvedPlanText(visit))}</p></div>` : ''}</div>${visit.language === "es" ? '<div class="review-note"><p>Spanish demonstration only. No clinical or community review has been supplied. Use fictional information; a worker must be able to compare both versions. Edit date or clinic in Capture, then review again.</p></div>' : `<section id="ai-controls" class="voice-panel" aria-label="Local AI drafting">${aiControls()}</section>`}${rejectedDraft ? `<section class="draft-panel rejected-draft"><span class="eyebrow">MODEL OUTPUT REJECTED · CANNOT BE SELECTED</span><p>${escape(rejectedDraft.text)}</p><small>${escape(rejectedDraft.message)} Your final wording has not changed.</small></section>` : ''}${visit.modelDraft ? `<section class="draft-panel"><span class="eyebrow">MODEL SUGGESTION · NOT APPROVED</span><p>${escape(visit.modelDraft.text)}</p><small>Basic checks passed; meaning still needs your review.</small><button type="button" class="button secondary" data-action="use-draft">Use this draft for review</button></section>` : ''}<div class="panel-heading preview-heading"><label for="patient-instruction">Final patient wording</label>${visit.language === "es" ? '<button type="button" class="text-button" data-action="edit">Edit return details</button>' : `<button type="button" class="text-button" data-action="use-original">${visit.handoff ? 'Use approved plan' : 'Use original'}</button>`}</div><textarea id="patient-instruction" lang="${visit.language || "en"}" ${visit.language === "es" ? "readonly" : ""} rows="5" maxlength="${MAX_INSTRUCTION_LENGTH}" required>${escape(visit.patientText)}</textarea><p class="field-help" id="patient-origin">${escape(visit.patientTextOrigin === 'translation-template' ? 'Fixed Spanish template · installed pack · unvalidated' : visit.patientTextOrigin === 'structured' ? 'Your approved structured plan' : visit.patientTextOrigin === 'original' ? 'Your original wording' : visit.patientTextOrigin === 'model' ? 'Model draft selected for your review' : 'Wording edited by you')}. No diagnosis or new treatment should be added.</p><label class="check-label"><input type="checkbox" id="patient-confirm" ${patientConfirmed ? 'checked' : ''}><span>${visit.language === "es" ? "I can read Spanish and compared both versions. The return action, date and clinic match. I approve this exact text for this fictional demonstration; this is not professional translation validation." : "I compared this wording with my source and approved clarifications. All confirmed actions and details are present, and I approve this exact patient wording."}</span></label><div class="form-actions">${button('Back to review','review',true)}<button class="button primary" type="submit">Approve & prepare care card${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('globe')}</span><h2>Your words. Your approval.</h2><p>Use the original, request an optional local draft, or edit the wording yourself. AI never chooses the patient’s next step.</p><p>Speak with the patient to check that the instruction makes sense. Any change requires your approval again.</p>`);
}

function currentLanguage() { return screen === 'savedCard' ? selectedCard?.language : visit?.language; }
function patientLabels() { return (screen === 'savedCard' ? selectedCard?.translation : visit?.translation)?.pack.labels || { nextStep: 'YOUR NEXT STEP', fromWorker: 'From your health worker', approved: 'Worker confirmed', hearStep: 'Hear your next step', play: 'Read aloud', again: 'Read again', pause: 'Pause', resume: 'Resume', stop: 'Stop', checkVoice: 'Check voice again', voice: 'Device voice', playbackNote: 'Reads the approved words on this card. Tap to start; use your device volume controls.' }; }
function patientCard(text) {
  const l = patientLabels(), lang = currentLanguage() || 'en';
  const card = screen === 'savedCard' ? selectedCard : cardFromVisit(visit);
  const lines = patientLines(card);
  return `<article class="final-card" lang="${lang}"><div class="final-card-head"><span class="card-logo">${icon('bridge')}VISIT BRIDGE</span><span class="confirmed-tag">${icon('check')}${escape(l.approved)}</span></div>${lang === 'es' ? `<p class="translation-notice">${escape(l.demoNotice)}</p>` : ''}<span class="card-eyebrow">${escape(l.nextStep)}</span><div class="patient-lines">${lines.map(line => `<p class="patient-line"><span class="patient-symbol">${icon(line.symbol)}</span><span>${escape(line.text) || "&nbsp;"}</span></p>`).join('')}</div><div class="card-rule"></div><div class="final-card-foot"><span>${escape(l.fromWorker)}</span><span>${lang === 'es' ? 'Español' : 'English'}</span></div><section id="playback-controls" class="playback-panel" aria-label="${escape(l.hearStep)}">${playbackControls()}</section><div class="ar-entry"><button type="button" class="button secondary" data-action="view-ar">${icon("card")}${lang === "es" ? "Ver tarjeta en RA" : "View card in AR"}</button><small>${lang === "es" ? "Coloque la tarjeta en una superficie con un dispositivo compatible." : "Place this approved card on a surface using a compatible AR device."}</small></div></article>`;
}
function playbackControls() {
  const { status, available, message, voiceName } = playbackState, l = patientLabels();
  const busy = ['starting','speaking','pausing','paused','resuming'].includes(status);
  const label = (text, action, primary=false) => `<button type="button" class="button ${primary ? 'primary' : 'secondary'}" data-action="${action}">${escape(text)}</button>`;
  return `<div class="playback-heading">${icon('speaker')}<strong>${escape(l.hearStep)}</strong><span class="voice-badge">${currentLanguage() === 'es' ? 'Español' : 'English'}</span></div><p role="status" aria-live="polite">${escape(currentLanguage() === 'es' ? l[status] || l.error : message)}</p><div class="playback-actions">${busy ? `${status === 'speaking' && playback.canPause ? label(l.pause,'pause-playback') : status === 'paused' && playback.canPause ? label(l.resume,'resume-playback',true) : ''}${label(l.stop,'stop-playback')}` : `<button type="button" class="button primary" data-action="read-aloud" ${available ? '' : 'disabled'}>${icon('speaker')}${escape(status === 'ended' ? l.again : l.play)}</button>${['unavailable','error'].includes(status) ? label(l.checkVoice,'check-playback') : ''}`}</div><small>${voiceName && available ? `${escape(l.voice)}: ${escape(voiceName)}. ` : ''}${escape(l.playbackNote)}</small>`;
}
function packControls() {
  return `<strong>Spanish return-visit pack</strong><p role="status">${escape(packError || (spanishPack ? `Installed on this device · version ${spanishPack.version} · unvalidated demo` : packStatus === 'checking' ? 'Checking saved pack…' : packStatus === 'installing' ? 'Installing…' : 'Not installed. Download once while connected; reuse offline.'))}</p>${spanishPack ? '' : `<button type="button" class="button secondary" data-action="install-language" ${['checking','installing'].includes(packStatus) ? 'disabled' : ''}>Install Spanish demo pack · 3 KB</button>`}<small>${visit.template ? 'Only the exact return-visit template is supported.' : 'Spanish is unavailable for free-text instructions. Use the return-visit template in Capture if it matches your chosen plan.'} No professional or community validation has been supplied.</small>`;
}
async function updatePack(install=false) {
  packStatus = install ? 'installing' : 'checking'; packError = ''; refreshPackPanel();
  try { spanishPack = await (install ? installLanguagePack() : loadLanguagePack()); packStatus = spanishPack ? 'installed' : 'missing'; }
  catch (problem) { spanishPack = null; packStatus = 'error'; packError = problem.message || 'Local language packs unavailable. Use English.'; }
  refreshPackPanel();
}
function refreshPackPanel() {
  updateReadiness();
  const panel = root.querySelector('#language-pack-controls'); if (!panel) return;
  panel.innerHTML = packControls();
  root.querySelector('#language option[value="es"]').disabled = !spanishPack || !visit.template || !spanishHandoffSupported(visit.handoff, visit.template);
}
function updatePlaybackControls() {
  const controls = root.querySelector('#playback-controls'); if (!controls) return;
  const action = controls.contains(document.activeElement) ? document.activeElement.dataset.action : null;
  controls.innerHTML = playbackControls();
  if (action) (controls.querySelector(`[data-action="${action}"]:not(:disabled)`) || controls.querySelector('[data-action="resume-playback"], [data-action="stop-playback"], [data-action="read-aloud"]:not(:disabled)'))?.focus();
}

function complete() {
  const text = patientInstruction(visit);
  return `<section class="completion"><span class="success-icon">${icon('check')}</span><span class="eyebrow">HANDOFF PREPARED</span><h1 tabindex="-1" id="page-heading">A next step to carry forward.</h1><p class="completion-intro">Show this card to the patient and explain the instruction together.</p>${patientCard(text)}${understandingPanel(visit, true)}<div class="save-panel" aria-live="polite">${saveError ? `<p class="error" role="alert">${escape(saveError)}</p>` : ''}${savedRevision === saveStamp(visit) ? `<p class="save-success">${icon('check')}Saved on this device. You can reopen this approved copy from Saved cards.</p>` : '<p>Save this approved card to reopen it here without a connection.</p>'}<button class="button secondary" data-action="save" ${saving || savedRevision === saveStamp(visit) ? 'disabled' : ''}>${saving ? 'Saving…' : savedRevision === saveStamp(visit) ? 'Saved on this device' : 'Save on this device'}</button><small>Demo information only. Saved text is kept in this browser and is not encrypted. Anyone using this browser can read it. Delete it from Saved cards when finished.</small></div><p class="completion-note">${savedRevision === saveStamp(visit) ? 'The saved copy remains after you finish this visit.' : 'Finishing without saving clears this visit.'} No card has been printed or sent.</p><div class="completion-actions">${button('Back to handoff','handoff',true)}${button('Finish visit','finish')}</div></section>`;
}

function render(focus = true) {
  root.innerHTML = `<div class="workspace" ${discardOpen || deleteId ? 'inert' : ''}>${sidebar()}<main class="main"><header class="topbar"><span>${['saved','savedCard'].includes(screen) ? 'Saved care cards' : screen === 'home' ? 'Overview' : 'Patient handoff'}</span><div class="topbar-status"><span class="prototype-badge">Prototype</span><span class="session-note" id="connection-status"></span></div></header><div class="page-content"><div id="offline-notice" class="offline-notice" role="status"></div>${({home, capture, review, handoff, complete, saved, savedCard})[screen]()}</div><footer class="main-footer"><span>Visit Bridge</span><span>World Bank · Small AI for development · Health</span></footer></main></div>${discardOpen ? `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="discard-heading"><h2 id="discard-heading">Discard this visit?</h2><p>Your current instruction will be removed from this session.</p><div class="form-actions">${button('Keep working','keep',true)}${button('Discard visit','discard')}</div></section></div>` : ''}${deleteId ? deleteDialog() : ''}`;
  updateStatus();
  updateVoiceControls();
  updatePlaybackControls();
  if (deleteId) root.querySelector('[data-action="keep-card"]').focus();
  else if (discardOpen) root.querySelector('[data-action="keep"]').focus();
  else if (focus) root.querySelector('#page-heading, .hero h1')?.focus();
}

function navigate(next) { if(next==='review' && reviewMode==='structured' && !visit.handoff) visit=setStructuredHandoff(visit,initialHandoff()); closeAR(); playback.stop(); speech.cancel(); model.cancel(); rejectedDraft = null; extractionProposal=null; extractionError=''; evidenceKey=null; screen = next; error = ''; discardOpen = false; if (next === 'handoff') patientConfirmed = visit.patientApprovedRevision === visit.patientTextRevision; render(); window.scrollTo(0, 0); if (next === 'capture' && !templateMode) speech.check(); if (next === 'review' || (next === 'handoff' && visit.language !== 'es')) model.check(); if (['complete','savedCard'].includes(next)) playback.check(currentLanguage()); }
function start() { structuredBackup=null; reviewMode='structured'; extractionProposal=null; speech.cancel(); speech.textEdited(); captureMode = 'type'; templateMode = false; templateDate = ''; templateLocation = 'clinic'; visit = createVisit(); confirmed = false; savedRevision = null; saveError = '';  navigate('capture'); }

root.addEventListener('input', event => {
  if (event.target.id === 'instruction') {
    speech.textEdited();
    setInstruction(event.target.value);
  }
  if (['return-date','return-location'].includes(event.target.id)) { templateDate = root.querySelector('#return-date').value; templateLocation = root.querySelector('#return-location').value; confirmed = false; visit = editInstruction(visit, '', true); const template = { id: TEMPLATE_ID, date: templateDate, location: templateLocation }; if (validTemplate(template)) visit = setReturnTemplate(visit, template); root.querySelector('#instruction').value = visit.originalInstruction; root.querySelector('#character-count').textContent = `${visit.originalInstruction.length} / ${MAX_INSTRUCTION_LENGTH}`; }
  if(event.target.dataset.detail) { model.cancel(); visit=setStructuredHandoff(visit, editHandoff(visit.handoff,event.target.dataset.detail,{value:event.target.value})); updateStructuredUI(); }
  if (event.target.id === 'worker-confirm') confirmed = event.target.checked;
  if (event.target.id === 'patient-instruction') { model.cancel(); visit = setPatientText(visit, event.target.value); patientConfirmed = false; rejectedDraft = null; root.querySelector('#patient-confirm').checked = false; root.querySelector('#patient-origin').textContent = 'Wording edited by you. No diagnosis or new treatment should be added.'; }
  if (event.target.id === 'patient-confirm') patientConfirmed = event.target.checked;
});
root.addEventListener('change', event => {
  if(event.target.id==='workflow' || event.target.dataset.state || event.target.dataset.required) {
    model.cancel();
    const h=event.target.id==='workflow' ? changeWorkflow(visit.handoff,event.target.value) : editHandoff(visit.handoff,event.target.dataset.state || event.target.dataset.required,event.target.dataset.state ? {state:event.target.value} : {required:event.target.checked});
    visit=setStructuredHandoff(visit,h); confirmed=false; extractionProposal=null; extractionError=''; const id=event.target.id; render(false); if(id) document.getElementById(id)?.focus();
  }
  if (event.target.id === 'language') {
    model.cancel(); patientConfirmed = false;
    try { visit = event.target.value ? selectLanguage(visit, event.target.value, spanishPack) : { ...visit, language: '', languageSource: null, translation: null, patientText: approvedPlanText(visit), patientTextOrigin: visit.handoff ? 'structured' : 'original', patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null }; error = ''; } catch (problem) { error = problem.message; }
    const position = window.scrollY; render(false); document.querySelector('#language').focus(); window.scrollTo(0, position);
  }
});
root.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  event.preventDefault();
  if((action==='structured-mode' && reviewMode!=='structured') || (action==='source-mode' && reviewMode!=='source')) { model.cancel(); if(visit.handoff) structuredBackup=structuredClone(visit.handoff); reviewMode=action==='structured-mode'?'structured':'source'; visit=setStructuredHandoff(visit,reviewMode==='structured' ? (structuredBackup?.sourceRevision===visit.revision ? structuredBackup : initialHandoff()) : null); confirmed=false; extractionProposal=null; extractionError=''; render(false); }
  if(action==='inspect-evidence') { evidenceKey=event.target.closest('[data-field]').dataset.field; root.querySelector('#review-source').innerHTML=sourceEvidence(); root.querySelector('#review-source').scrollIntoView({block:'center',behavior:'smooth'}); }
  if(action==='extract-note') { extractionProposal=null; extractionError=''; rejectedExtractionText=''; render(false); model.extract(visit); }
  if(action==='discard-extraction') { extractionProposal=null; extractionError=''; render(false); }
  if(action==='apply-extraction' && extractionProposal) { if(!root.querySelector('#replace-details')?.checked) { error='Confirm that you want to replace the current fields.'; render(false); } else { const h=structuredClone(extractionProposal); h.revision=visit.handoff.revision+1; visit=setStructuredHandoff(visit,h); confirmed=false; extractionProposal=null; render(false); } }
  if (action === 'mark-understanding') {
    try { visit = markUnderstanding(visit, event.target.closest('[data-result]').dataset.result); error = ''; render(false); root.querySelector('#understanding-summary')?.focus(); }
    catch (problem) { error = problem.message; render(false); }
  }
  if (action === 'clear-understanding') { visit = { ...visit, understanding: null }; render(false); root.querySelector('#understanding-summary')?.focus(); }
  if (action === 'check-readiness') { model.check(); speech.check(); updatePack(); updateReadiness(); }
  if (action === 'view-ar') openAR();
  if (action === 'read-aloud') {
    try {
      const card = screen === 'complete' && visit && canShare(visit) ? cardFromVisit(visit) : screen === 'savedCard' && isValidCard(selectedCard) ? selectedCard : null;
      if (card) playback.play(card);
    } catch { playback.stop(); }
  }
  if (action === 'pause-playback') playback.pause();
  if (action === 'resume-playback') playback.resume();
  if (action === 'stop-playback') playback.stop();
  if (action === 'check-playback') playback.check(currentLanguage());
  if (action === 'install-language') updatePack(true);
  if (action === 'return-template') { speech.cancel(); templateMode = true; visit = editInstruction(visit, '', true); confirmed = false; render(false); root.querySelector('#return-date').focus(); }
  if (action === 'free-text') { templateMode = false; visit = editInstruction(visit, visit.originalInstruction, true); confirmed = false; render(false); }
  if (action === 'install-model') model.install();
  if (action === 'cancel-model') model.cancel();
  if (action === 'generate-model') { rejectedDraft = null; model.generate(visit); }
  if (action === 'use-original' || action === 'use-draft') { error = ''; model.cancel(); visit = setPatientText(visit, action === 'use-original' ? approvedPlanText(visit) : visit.modelDraft.text, action === 'use-original' ? (visit.handoff ? 'structured' : 'original') : 'model'); patientConfirmed = false; render(false); }
  if (action === 'type-mode') { speech.cancel(); captureMode = 'type'; updateVoiceControls(); root.querySelector('#instruction')?.focus(); }
  if (action === 'dictate-mode') { captureMode = 'dictate'; updateVoiceControls(); speech.check(); }
  if (action === 'dictate') speech.start(visit.originalInstruction);
  if (action === 'stop-dictation') speech.stop();
  if (action === 'discard-dictation') speech.discard();
  if (action === 'check-speech') speech.check();
  if (action === 'download-speech') speech.install();
  if (action === 'saved') { navigate('saved'); refreshCards(); }
  if (action === 'open-card') {
    selectedCard = cards.find(card => card.id === event.target.closest('[data-card-id]').dataset.cardId);
    if (selectedCard) navigate('savedCard');
  }
  if (action === 'save') saveCurrentCard();
  if (action === 'request-delete') { closeAR(); playback.stop(); deleteId = event.target.closest('[data-card-id]').dataset.cardId; render(false); }
  if (action === 'keep-card' && !deleting) { deleteId = null; render(); }
  if (action === 'delete-card') deleteCard();
  if (action === 'install') promptInstall();
  if (action === 'home') navigate('home');
  if (action === 'start') start();
  if (action === 'resume') visit ? navigate(visit.status === 'confirmed' ? 'handoff' : 'capture') : start();
  if (action === 'sample') { speech.cancel(); speech.textEdited(); visit = editInstruction(visit, 'Return to the clinic on Tuesday.'); confirmed = false; render(false); document.querySelector('#instruction').focus(); }
  if (action === 'edit') { templateMode = Boolean(visit.template); if (templateMode) { templateDate = visit.template.date; templateLocation = visit.template.location; } navigate('capture'); }
  if (action === 'review') { if(reviewMode==='structured' && !visit.handoff) visit=setStructuredHandoff(visit,initialHandoff()); confirmed = visit.status === 'confirmed'; navigate('review'); }
  if (action === 'handoff') navigate('handoff');
  if (action === 'cancel') { speech.cancel(); model.cancel(); discardOpen = true; render(false); }
  if (action === 'keep') { discardOpen = false; render(false); root.querySelector('[data-action="cancel"]').focus(); }
  if (action === 'discard' || action === 'finish') { visit = null; confirmed = false; navigate('home'); }
});
root.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (event.target.id === 'capture-form') {
      if (speech.isBusy()) { error = 'Stop dictation and check the captured words before reviewing.'; return; }
      if (templateMode && !validTemplate(visit.template)) throw new Error('Choose a valid return date and clinic.');
      const problem = instructionError(visit.originalInstruction); if (problem) throw new Error(problem);
      confirmed = visit.status === 'confirmed'; navigate('review');
    } else if (event.target.id === 'review-form') { visit = confirmVisit(visit, confirmed); navigate('handoff'); }
    else if (event.target.id === 'handoff-form') {
      visit = confirmPatientText(visit, patientConfirmed);
      navigate('complete');
    }
  } catch (problem) { error = problem.message; render(false); root.querySelector('.error')?.scrollIntoView({ block: 'center' }); }
});
document.addEventListener('keydown', event => {
  if (arOverlay) { if (event.key === 'Escape') { event.preventDefault(); closeAR(); return; } if (event.key === 'Tab') { const buttons = [...arOverlay.querySelectorAll('button:not(:disabled)')]; if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); } } return; }
  if (event.key === 'Escape' && playback.isBusy()) { playback.stop(); return; }
  if (event.key === 'Escape' && speech.isBusy()) { speech.cancel(); root.querySelector('#instruction')?.focus(); return; }
  if (!discardOpen && !deleteId) return;
  if (event.key === 'Escape' && deleteId && !deleting) { deleteId = null; render(); return; }
  if (event.key === 'Escape' && discardOpen) { discardOpen = false; render(false); root.querySelector('[data-action="cancel"]').focus(); }
  if (event.key === 'Tab') {
    const buttons = [...root.querySelectorAll('.modal button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  }
});
function saved() {
  return `<div class="flow-title"><span class="eyebrow">ON THIS DEVICE</span><h1 tabindex="-1" id="page-heading">Saved care cards</h1><p>Approved copies saved in this browser. They are available offline on this device.</p></div><div class="storage-notice">${icon('shield')}<p>Use fictional information only. Saved text is not encrypted and is visible to anyone using this browser. Browser storage can be cleared or removed by the browser; these cards have no cloud backup.</p></div>${storageError ? `<div class="error" role="alert">${escape(storageError)} ${button('Try again','saved',true)}</div>` : ''}${cardsLoading ? '<p role="status">Loading saved cards…</p>' : !cards.length && !storageError ? `<section class="empty-state">${icon('card')}<h2>No saved cards yet.</h2><p>Prepare a handoff, then choose “Save on this device.”</p>${button(visit ? 'Continue current visit' : 'Start a visit', visit ? 'resume' : 'start')}</section>` : `<div class="saved-grid">${cards.map(card => `<article class="saved-item"><span class="confirmed-tag">${icon('check')}Approved copy · ${card.language === "es" ? "Español · unvalidated demo" : "English"}</span><p>${escape(card.instruction.slice(0, 140))}${card.instruction.length > 140 ? '…' : ''}</p><small>Saved ${escape(dateLabel(card.savedAt))}<br>Understanding: ${escape(currentUnderstanding(card)?.result === "needs-follow-up" ? "Needs follow-up" : currentUnderstanding(card)?.result === "understood" ? "Understood · worker observed" : currentUnderstanding(card)?.result === "clarified" ? "Clarified · not confirmed" : "Not recorded")}</small><div class="saved-item-actions">${`<button class="button secondary" data-action="open-card" data-card-id="${escape(card.id)}">Open card</button><button class="text-button danger" data-action="request-delete" data-card-id="${escape(card.id)}" aria-label="Delete card saved ${escape(dateLabel(card.savedAt))}">Delete</button>`}</div></article>`).join('')}</div>`}`;
}

function savedCard() {
  return `<section class="completion"><span class="eyebrow">SAVED APPROVED COPY</span><h1 tabindex="-1" id="page-heading">Your saved care card</h1><p class="completion-intro">This is the wording approved when this copy was saved.</p>${patientCard(selectedCard.instruction)}${understandingPanel(selectedCard, false)}<p class="completion-note">Reviewed ${escape(dateLabel(selectedCard.patientApprovedAt || selectedCard.confirmedAt))}<br>Saved ${escape(dateLabel(selectedCard.savedAt))} · Revision ${selectedCard.revision}<br>Later edits to a visit are not reflected in this saved copy until it is reviewed and saved again.</p>${selectedCard.schemaVersion >= 2 ? `<details class="audit-details"><summary>Original instruction and review record</summary><blockquote>${escape(selectedCard.originalInstruction)}</blockquote><p>Source approved ${escape(dateLabel(selectedCard.confirmedAt))}. ${selectedCard.translation ? `Translation pack: ${escape(selectedCard.translation.pack.id)} · ${escape(selectedCard.translation.pack.version)} · demonstration-unvalidated. No professional or community review.` : ""} Final wording: ${escape(selectedCard.patientTextOrigin)}. Wording revision ${selectedCard.patientTextRevision}.</p>${structuredRecord(selectedCard.handoff)}${selectedCard.modelDraft ? `<p>Draft model: ${escape(selectedCard.modelDraft.model)} · ${escape(selectedCard.modelDraft.modelRevision)}</p>` : ''}</details>` : ''}<div class="completion-actions">${button('Back to saved cards','saved',true)}<button class="text-button danger" data-action="request-delete" data-card-id="${escape(selectedCard.id)}">Delete from this device</button></div></section>`;
}

function deleteDialog() {
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-heading"><h2 id="delete-heading">Delete this saved card?</h2><p>This removes the saved copy from this browser. It cannot be undone.</p>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<div class="form-actions"><button class="button secondary" data-action="keep-card" ${deleting ? 'disabled' : ''}>Keep card</button><button class="button primary" data-action="delete-card" ${deleting ? 'disabled' : ''}>${deleting ? 'Deleting…' : 'Delete card'}</button></div></section></div>`;
}

async function refreshCards() {
  cardsLoading = true; storageError = '';
  try { cards = await cardRepository.list(); }
  catch { storageError = 'Saved cards could not be loaded. Device storage may be unavailable. No saved content has been changed.'; }
  finally {
    cardsLoading = false;
    if (screen === 'saved') render(false);
    else { const counter = root.querySelector('#saved-count'); if (counter) counter.textContent = cards.length; }
  }
}

async function saveCurrentCard() {
  if (saving || !visit || !canShare(visit) || savedRevision === saveStamp(visit)) return;
  const snapshot = { ...visit };
  saving = true; saveError = ''; render(false);
  try {
    const card = await saveApprovedCard(snapshot, cardRepository);
    cards = [card, ...cards.filter(existing => existing.id !== card.id)];
    if (visit?.id === snapshot.id && saveStamp(visit) === saveStamp(snapshot)) savedRevision = saveStamp(snapshot);
  } catch { saveError = 'This card was not saved. Device storage may be unavailable or full. Keep the card open and try again.'; }
  finally { saving = false; render(false); }
}

async function deleteCard() {
  if (!deleteId || deleting) return;
  const id = deleteId;
  deleting = true; error = ''; render(false);
  try {
    await cardRepository.remove(id);
    cards = cards.filter(card => card.id !== id);
    if (visit?.id === id) savedRevision = null;
    deleteId = null; selectedCard = null;
    navigate('saved');
    const notice = root.querySelector('#offline-notice');
    notice.textContent = 'Card deleted from this device.'; notice.classList.add('visible');
  } catch { error = 'The card could not be deleted. It remains saved. Try again.'; }
  finally { deleting = false; if (deleteId) render(false); }
}

function updateStatus() {
  updateReadiness();
  const connection = root.querySelector('#connection-status');
  if (connection) connection.textContent = navigator.onLine ? 'Device reports online' : 'Device offline';
  const notice = root.querySelector('#offline-notice');
  if (notice) {
    notice.classList.toggle('visible', true);
    notice.textContent = offline.ready
      ? `${navigator.onLine ? 'Offline access ready.' : 'You are offline.'} The app and saved cards can open on this device. Unsaved drafts still clear on reload.`
      : offline.error || offline.unsupported
        ? 'Offline app loading is unavailable in this browser. Saved cards use device storage; keep this page open when disconnected.'
        : 'Preparing offline app access. Keep this page open until offline access is ready.';
    if (offline.updateAvailable) notice.textContent += ' An app update is ready. Close all Visit Bridge tabs and reopen to update.';
  }
  const install = root.querySelector('#install-control');
  if (install) install.innerHTML = installPrompt ? button('Install Visit Bridge','install',true) : '<small>To install, use your browser’s Install app or Add to Home Screen option, where supported.</small>';
}

async function promptInstall() {
  if (!installPrompt) return;
  const prompt = installPrompt; installPrompt = null;
  try { await prompt.prompt(); await prompt.userChoice; } catch { /* Browser keeps control of install eligibility. */ }
  updateStatus();
}
function setInstruction(text) {
  if (!visit || screen !== 'capture') return;
  visit = editInstruction(visit, text); confirmed = false;
  const field = root.querySelector('#instruction');
  if (field && field.value !== text) field.value = text;
  const count = root.querySelector('#character-count');
  if (count) count.textContent = `${text.length} / ${MAX_INSTRUCTION_LENGTH}`;
}

function voiceControls() {
  const busy = ['starting', 'listening', 'stopping'].includes(speechState.status);
  const ready = ['ready', 'review'].includes(speechState.status);
  return `<div class="capture-modes" role="group" aria-label="Instruction input method"><button type="button" class="mode-button ${captureMode === 'type' ? 'selected' : ''}" data-action="type-mode" aria-pressed="${captureMode === 'type'}">${icon('note')}Type instruction</button><button type="button" class="mode-button ${captureMode === 'dictate' ? 'selected' : ''}" data-action="dictate-mode" aria-pressed="${captureMode === 'dictate'}" ${busy ? 'disabled' : ''}>${icon('mic')}Dictate instruction</button></div>${captureMode === 'dictate' ? `<section class="voice-panel ${busy ? 'recording' : ''}" aria-label="On-device English dictation"><div class="voice-heading">${icon('mic')}<strong>${speechState.status === 'listening' ? 'Microphone active' : speechState.status === 'starting' ? 'Waiting for microphone access' : speechState.status === 'stopping' ? 'Stopping microphone' : 'On-device English dictation'}</strong><span class="voice-badge">Local only</span></div><p id="speech-status" role="status">${escape(speechState.message)}</p>${speechState.interim ? `<div class="interim-preview"><span>HEARD SO FAR · NOT YET ACCEPTED</span><p>${escape(speechState.interim)}</p></div>` : ''}<div class="voice-actions">${busy ? `<button type="button" class="button primary" data-action="stop-dictation" ${speechState.status === 'stopping' ? 'disabled' : ''}>${speechState.status === 'starting' ? 'Cancel microphone request' : 'Stop recording'}</button>` : `<button type="button" class="button secondary" data-action="dictate" ${ready ? '' : 'disabled'}>${icon('mic')}${speechState.status === 'review' ? 'Dictate more' : 'Start dictation'}</button>`}${speechState.status === 'downloadable' ? '<button type="button" class="text-button" data-action="download-speech">Download English speech pack</button>' : ['error','blocked','unsupported','waiting','idle'].includes(speechState.status) ? '<button type="button" class="text-button" data-action="check-speech">Check again</button>' : ''}${speechState.canDiscard ? '<button type="button" class="text-button" data-action="discard-dictation">Discard dictated words</button>' : ''}</div><small>Speak only the next step you chose. Use fictional demo information and omit identifying details. Stop recording to edit the accepted words below. No raw audio is saved by Visit Bridge.</small></section>` : ''}`;
}

function updateVoiceControls() {
  const controls = root.querySelector('#voice-controls');
  if (!controls) return;
  const focusedAction = controls.contains(document.activeElement) ? document.activeElement.dataset.action : null;
  controls.innerHTML = voiceControls();
  const busy = ['starting', 'listening', 'stopping'].includes(speechState.status);
  const field = root.querySelector('#instruction');
  field.readOnly = busy;
  root.querySelector('#capture-form button[type="submit"]').disabled = busy;
  root.querySelector('[data-action="sample"]').disabled = busy;
  if (focusedAction) {
    const replacement = controls.querySelector(`[data-action="${focusedAction}"]:not(:disabled)`)
      || controls.querySelector('[data-action="stop-dictation"]:not(:disabled)');
    replacement?.focus();
  }
  if (['starting','listening','stopping'].includes(previousSpeechStatus) && !busy) field.focus();
  previousSpeechStatus = speechState.status;
}

const speech = createSpeechController({
  onState: state => { speechState = state; updateVoiceControls(); updateReadiness(); },
  onText: text => setInstruction(text),
});
function initialHandoff() { return visit.template ? templateHandoff(visit.template,visit.originalInstruction,visit.revision,visit.template.location==='clinic'?'the clinic':'the community clinic') : createHandoff(visit.revision); }
const model = createModelController({ onState: state => { modelState = state; updateAI(); updateReadiness(); }, onDraft: draft => {
  if(draft.type==='extraction' || draft.type==='extraction-rejected') {
    if(!visit || screen!=='review' || !visit.handoff || draft.revision!==visit.revision || draft.handoffRevision!==visit.handoff.revision) return;
    if(draft.type==='extraction') { extractionProposal=draft.handoff; extractionError=''; } else { extractionProposal=null; extractionError=draft.message; rejectedExtractionText=draft.text || ''; }
    render(false); return;
  }
  if (!visit || screen !== 'handoff' || visit.revision !== draft.revision || visit.language !== draft.language) return;
  if (draft.type === 'rejected') { rejectedDraft = { text: draft.text, message: draft.message }; render(false); return; }
  rejectedDraft = null;
  visit = { ...visit, modelDraft: { text: draft.text, revision: draft.revision, language: draft.language, model: draft.model, modelRevision: draft.modelRevision } };
  render(false);
} });

function openAR() {
  const card = screen === 'complete' && visit && canShare(visit) ? cardFromVisit(visit) : screen === 'savedCard' && isValidCard(selectedCard) ? selectedCard : null;
  if (!card || arOverlay) return;
  playback.stop(); speech.cancel(); model.cancel(); arSnapshot = structuredClone(card);
  const es=card.language==='es';
  arOverlay=document.createElement('section'); arOverlay.className='ar-dialog'; arOverlay.setAttribute('role','dialog');arOverlay.setAttribute('aria-modal','true');arOverlay.setAttribute('aria-labelledby','ar-heading');arOverlay.lang=card.language;
  arOverlay.innerHTML=`<header class="ar-header"><div><span class="eyebrow">VISIT BRIDGE · ${es?'REALIDAD AUMENTADA':'SPATIAL AR'}</span><h2 id="ar-heading">${es?'Su próximo paso, a la vista':'Keep your next step in view'}</h2></div><button type="button" class="button secondary" data-ar-action="exit">${es?'Volver a la tarjeta':'Back to card'}</button></header><div class="ar-intro"><p>${es?'Al iniciar, su navegador solicitará acceso a su entorno. La cámara se usa para colocar esta tarjeta. Visit Bridge no graba, guarda ni envía imágenes.':'Start AR asks your browser for access to your surroundings. The camera is used to place this card. Visit Bridge does not record, save or send images.'}</p><p>${es?'Use información ficticia. La tarjeta normal sigue disponible.':'Use fictional information. The regular card remains available.'}</p></div><article class="ar-preview">${es?`<p class="translation-notice">${escape(card.translation.pack.labels.demoNotice)}</p>`:''}<span class="eyebrow">${es?'TEXTO APROBADO':'APPROVED CARD TEXT'}</span><p>${escape(card.instruction)}</p></article><footer class="ar-footer"><p id="ar-status" role="status" aria-live="polite"></p><div id="ar-actions"></div><small>${es?'Mueva el teléfono lentamente. Coloque la tarjeta en una superficie despejada.':'Move slowly. Place the card on a clear surface. Surface tracking needs a compatible device.'}</small></footer>`;
  arOverlay.addEventListener('beforexrselect',event=>{if(event.target.closest?.('button'))event.preventDefault();});
  arOverlay.addEventListener('click',event=>{const action=event.target.closest('[data-ar-action]')?.dataset.arAction;if(!action)return;event.preventDefault(); if(action==='exit')closeAR();if(action==='start')ar.start(arSnapshot,arOverlay);if(action==='place')ar.place();if(action==='reposition')ar.reposition();if(action==='larger')ar.resize(.1);if(action==='smaller')ar.resize(-.1);if(action==='rotate')ar.rotate(Math.PI/12);if(action==='retry')ar.check();});
  document.body.append(arOverlay);root.inert=true;updateAR();arOverlay.querySelector('[data-ar-action="exit"]').focus();ar.check();
}
function updateAR() {
  if(!arOverlay)return;
  const es=arSnapshot.language==='es', {status,active,placed,canPlace}=arState;
  const messages={checking:'Comprobando compatibilidad…',ready:'Listo. Inicie RA para solicitar acceso a su entorno.',starting:'Iniciando RA. Responda a la solicitud de su navegador.',scanning:'Mueva el teléfono lentamente sobre una superficie despejada.',surface:'Superficie encontrada. Pulse Colocar tarjeta.',placed:'Tarjeta colocada. Puede moverse alrededor o volver a colocarla.',tracking:'Seguimiento en pausa. Muévase lentamente hasta que vuelva la vista.',unavailable:'RA espacial no disponible. Use la tarjeta normal o un dispositivo compatible.',error:'No se pudo iniciar o continuar RA. La tarjeta normal sigue disponible.',idle:'RA finalizada. Puede volver a la tarjeta normal.'};
  arOverlay.classList.toggle('session-active',active);
  arOverlay.querySelector('#ar-status').textContent=es?messages[status]:arState.message;
  const controls=arOverlay.querySelector('#ar-actions'),focused=controls.contains(document.activeElement)?document.activeElement.dataset.arAction:null;
  const b=(label,action,disabled=false)=>`<button type="button" class="button secondary" data-ar-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
  controls.innerHTML=active ? (placed?b(es?'Volver a colocar':'Reposition','reposition')+b(es?'Más grande':'Larger','larger')+b(es?'Más pequeña':'Smaller','smaller')+b(es?'Girar':'Rotate','rotate'):b(es?'Colocar tarjeta':'Place card','place',!canPlace)) : status==='ready'||status==='idle'?b(es?'Iniciar RA':'Start AR','start'):['unavailable','error'].includes(status)?b(es?'Comprobar de nuevo':'Check again','retry'):'';
  if(focused)(controls.querySelector(`[data-ar-action="${focused}"]:not(:disabled)`)||controls.querySelector('button:not(:disabled)')||arOverlay.querySelector('[data-ar-action="exit"]')).focus();
}
function closeAR() {
  if(!arOverlay)return;
  ar.stop();arOverlay.remove();arOverlay=null;arSnapshot=null;root.inert=false;root.querySelector('[data-action="view-ar"]')?.focus();
}

const ar = createARController({ onState: state => { arState=state; updateAR(); } });
const playback = createPlaybackController({ onState: state => { playbackState = state; updatePlaybackControls(); } });
window.addEventListener('pagehide', () => { closeAR(); playback.stop(); speech.cancel(); model.cancel(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { closeAR(); playback.stop(); speech.cancel(); model.cancel(); } });
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; updateStatus(); });
window.addEventListener('appinstalled', () => { installPrompt = null; updateStatus(); });
render(false);
refreshCards();
initializeOffline(state => { offline = state; updateStatus(); });

updatePack();
model.check();
speech.check();
window.speechSynthesis?.addEventListener?.('voiceschanged', updateReadiness);
