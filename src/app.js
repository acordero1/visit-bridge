import { createVisit, editInstruction, instructionError, selectLanguage, confirmVisit,
  patientInstruction, canShare, MAX_INSTRUCTION_LENGTH } from './visit.js';

const root = document.querySelector('#app');
let visit = null;
let screen = 'home';
let error = '';
let confirmed = false;
let discardOpen = false;
const icons = {
  bridge: '<path d="M3 17v-5a9 9 0 0 1 18 0v5M3 14h18M8 14v7m8-7v7"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6m-6 4h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
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
    <button class="nav-item ${screen !== 'home' ? 'active' : ''}" data-action="resume">${icon('note')}${visit ? 'Current visit' : 'New visit'}${visit ? '<span class="nav-dot"></span>' : ''}</button>
    <div class="sidebar-note">${icon('bridge')}<p>A clear next step.<br>A little more confidence.<br>Care that carries on.</p></div>
    <div class="sidebar-footer"><span class="avatar">HW</span><span>Health worker<small>Demo workspace</small></span></div></aside>`;
}

function home() {
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow">THE VISIT ENDS. THE CARE CONTINUES.</span>
    <h1 tabindex="-1">A clear next step.<br>For every patient.</h1><p>Turn the next step you’ve chosen into a simple handoff your patient can take with them.</p>
    ${button(visit ? 'Continue current visit' : 'Start a visit', visit ? 'resume' : 'start')}<div class="hero-footnote">${icon('shield')}Your decision. Your review. Their next step.</div></div>
    <div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-badge">${icon('check')}Worker confirmed</div><div class="example-card"><div class="card-logo">${icon('bridge')}VISIT BRIDGE</div><span class="card-eyebrow">EXAMPLE HANDOFF</span><h2>Your next step</h2><p>Return to the clinic<br>on Tuesday.</p><div class="card-rule"></div><div class="example-meta">A reminder from your health worker<span>English · Read</span></div></div><div class="art-caption">Small instructions.<br>Meaningful connections.</div></div></section>
    <div class="section-heading"><h2>A handoff in three simple steps</h2><span>Designed around the worker’s decision</span></div>
    <section class="how-grid">${[
      ['01','note','Capture the next step','Write the instruction you have already chosen for your patient.'],
      ['02','shield','Review with confidence','Check the wording and confirm it before preparing the handoff.'],
      ['03','card','Make it easy to remember','Open a simple, readable care card on the device you already use.'],
    ].map(([number, name, title, copy]) => `<article class="how-card"><div class="how-top"><span class="icon-tile">${icon(name)}</span><span class="step-number">${number}</span></div><h3>${title}</h3><p>${copy}</p></article>`).join('')}</section>
    <section class="scope-strip">${icon('shield')}<div><strong>Communication support, with the worker in control.</strong><p>Visit Bridge helps communicate a plan you have already decided. It does not diagnose, prescribe, or choose treatment.</p></div><span class="scope-tag">FOUNDATION DEMO</span></section>
    <section class="roadmap"><span>Coming in later build phases</span><div><span>${icon('mic')}Voice capture</span><span>${icon('globe')}Local language support</span><span>${icon('wifi')}Offline access</span></div></section>`;
}

function progress(active) {
  return `<ol class="progress" aria-label="Visit progress">${steps.map((name, index) => `<li ${active === index ? 'aria-current="step"' : ''} class="${index < active ? 'done' : ''} ${index === active ? 'current' : ''}"><span>${index < active ? icon('check') : index + 1}</span>${name}</li>`).join('')}</ol>`;
}

function formLayout(active, title, subtitle, content, aside) {
  return `<div class="flow-heading"><span class="eyebrow">CURRENT VISIT · DEMO</span><button class="text-button" data-action="cancel">Cancel visit</button></div>${progress(active)}<div class="flow-title"><h1 tabindex="-1" id="page-heading">${title}</h1><p>${subtitle}</p></div><div class="flow-grid"><section class="form-panel">${error ? `<div class="error" role="alert">${escape(error)}</div>` : ''}${content}</section><aside class="helper-panel">${aside}<div class="privacy-note">${icon('shield')}<p>Use sample information only. This draft stays in memory and is cleared when you reload or close this page.</p></div></aside></div>`;
}

function capture() {
  return formLayout(0, 'What is the next step?', 'Record the instruction you have already chosen for this patient.',
    `<form id="capture-form"><label for="instruction">Your instruction <span>Required</span></label><p class="field-help" id="instruction-help">Use clear, specific wording. Leave out patient names and other identifying details.</p><textarea id="instruction" name="instruction" rows="7" maxlength="${MAX_INSTRUCTION_LENGTH}" aria-describedby="instruction-help character-count" placeholder="For example: Return to the clinic on Tuesday." required>${escape(visit.originalInstruction)}</textarea><div class="input-meta"><span>${icon('note')}Written by the health worker</span><span id="character-count">${visit.originalInstruction.length} / ${MAX_INSTRUCTION_LENGTH}</span></div><button type="button" class="sample-button" data-action="sample">Try a sample instruction</button><div class="form-actions"><button type="button" class="button secondary" data-action="home">Back to overview</button><button class="button primary" type="submit">Review instruction${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('note')}</span><h2>Start with your decision.</h2><p>Capture the next step in your own words. You’ll review it before your patient sees it.</p><div class="helper-example"><span>EXAMPLE</span><p>“Return to the clinic on Tuesday.”</p></div><p class="future-note">Voice capture will be added in a later phase.</p>`);
}

function review() {
  return formLayout(1, 'Review your instruction', 'Make sure this is exactly what you want to communicate.',
    `<div class="panel-heading"><span class="eyebrow">YOUR ORIGINAL INSTRUCTION</span><button class="text-button" data-action="edit">Edit instruction</button></div><blockquote class="instruction-text">${escape(visit.originalInstruction)}</blockquote><div class="review-note">${icon('shield')}<p>This wording is yours. No AI rewrite or translation has been applied.</p></div><form id="review-form"><label class="check-label"><input type="checkbox" id="worker-confirm" ${confirmed ? 'checked' : ''}/><span>I reviewed this instruction and confirm it is the next step I chose for the patient.</span></label><div class="form-actions">${button('Back to capture','edit',true)}<button class="button primary" type="submit">Confirm & continue${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('shield')}</span><h2>You stay in control.</h2><p>Only an instruction you have reviewed and confirmed can become a patient handoff.</p><p>If you edit the wording, you’ll review and confirm it again.</p>`);
}

function handoff() {
  return formLayout(2, 'Prepare the patient handoff', 'Choose the patient language and preview the approved instruction.',
    `<form id="handoff-form"><label for="language">Patient language <span>Required</span></label><p class="field-help" id="language-help">English is available for this demo. Additional languages need a validated language pack.</p><select id="language" required aria-describedby="language-help"><option value="">Select a language</option><option value="en" ${visit.language === 'en' ? 'selected' : ''}>English · demo</option></select><div class="format-box"><span class="icon-tile">${icon('card')}</span><div><strong>Readable care card</strong><p>Show the instruction on this device.</p></div><span class="format-tag">Available</span></div><p class="future-note">Spoken playback and translated explanations are planned for later phases.</p><div class="panel-heading preview-heading"><span class="eyebrow">PATIENT PREVIEW</span><span class="confirmed-tag">${icon('check')}Worker confirmed</span></div><div class="patient-preview"><span>Your next step</span><p>${escape(visit.originalInstruction)}</p><small>Instruction from your health worker · ${visit.language ? 'English' : 'Language not yet selected'}</small></div><div class="form-actions">${button('Back to review','review',true)}<button class="button primary" type="submit">Prepare care card${icon('arrow')}</button></div></form>`,
    `<span class="icon-tile">${icon('globe')}</span><h2>Ready to explain together.</h2><p>Show the patient the instruction and give them a chance to ask questions.</p><p>This first version displays the exact wording you confirmed.</p>`);
}

function complete() {
  const text = patientInstruction(visit);
  return `<section class="completion"><span class="success-icon">${icon('check')}</span><span class="eyebrow">HANDOFF PREPARED</span><h1 tabindex="-1" id="page-heading">A next step to carry forward.</h1><p class="completion-intro">Show this card to the patient and explain the instruction together.</p><article class="final-card"><div class="final-card-head"><span class="card-logo">${icon('bridge')}VISIT BRIDGE</span><span class="confirmed-tag">${icon('check')}Worker confirmed</span></div><span class="card-eyebrow">YOUR NEXT STEP</span><p class="final-instruction">${escape(text)}</p><div class="card-rule"></div><div class="final-card-foot"><span>From your health worker</span><span>English · Read</span></div></article><p class="completion-note">This card is displayed on this device. It has not been saved, printed, or sent.</p><div class="completion-actions">${button('Back to handoff','handoff',true)}${button('Finish visit','finish')}</div></section>`;
}

function render(focus = true) {
  root.innerHTML = `<div class="workspace" ${discardOpen ? 'inert' : ''}>${sidebar()}<main class="main"><header class="topbar"><span>${screen === 'home' ? 'Overview' : 'Patient handoff'}</span><div class="topbar-status"><span class="prototype-badge">Prototype</span><span class="session-note">In-memory session</span></div></header><div class="page-content">${({home, capture, review, handoff, complete})[screen]()}</div><footer class="main-footer"><span>Visit Bridge</span><span>World Bank · Small AI for development · Health</span></footer></main></div>${discardOpen ? `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="discard-heading"><h2 id="discard-heading">Discard this visit?</h2><p>Your current instruction will be removed from this session.</p><div class="form-actions">${button('Keep working','keep',true)}${button('Discard visit','discard')}</div></section></div>` : ''}`;
  if (discardOpen) root.querySelector('[data-action="keep"]').focus();
  else if (focus) root.querySelector('#page-heading, .hero h1')?.focus();
}

function navigate(next) { screen = next; error = ''; discardOpen = false; render(); window.scrollTo(0, 0); }
function start() { visit = createVisit(); confirmed = false; navigate('capture'); }

root.addEventListener('input', event => {
  if (event.target.id === 'instruction') {
    visit = editInstruction(visit, event.target.value); confirmed = false;
    document.querySelector('#character-count').textContent = `${event.target.value.length} / ${MAX_INSTRUCTION_LENGTH}`;
  }
  if (event.target.id === 'worker-confirm') confirmed = event.target.checked;
});
root.addEventListener('change', event => {
  if (event.target.id === 'language') {
    visit = event.target.value ? selectLanguage(visit, event.target.value) : { ...visit, language: '', languageSource: null };
    const position = window.scrollY; render(false); document.querySelector('#language').focus(); window.scrollTo(0, position);
  }
});
root.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  event.preventDefault();
  if (action === 'home') navigate('home');
  if (action === 'start') start();
  if (action === 'resume') visit ? navigate(visit.status === 'confirmed' ? 'handoff' : 'capture') : start();
  if (action === 'sample') { visit = editInstruction(visit, 'Return to the clinic on Tuesday.'); confirmed = false; render(false); document.querySelector('#instruction').focus(); }
  if (action === 'edit') navigate('capture');
  if (action === 'review') { confirmed = visit.status === 'confirmed'; navigate('review'); }
  if (action === 'handoff') navigate('handoff');
  if (action === 'cancel') { discardOpen = true; render(false); }
  if (action === 'keep') { discardOpen = false; render(false); root.querySelector('[data-action="cancel"]').focus(); }
  if (action === 'discard' || action === 'finish') { visit = null; confirmed = false; navigate('home'); }
});
root.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (event.target.id === 'capture-form') {
      const problem = instructionError(visit.originalInstruction); if (problem) throw new Error(problem);
      confirmed = visit.status === 'confirmed'; navigate('review');
    } else if (event.target.id === 'review-form') { visit = confirmVisit(visit, confirmed); navigate('handoff'); }
    else if (event.target.id === 'handoff-form') {
      if (!canShare(visit)) throw new Error('Select the patient language before preparing the card.');
      navigate('complete');
    }
  } catch (problem) { error = problem.message; render(false); root.querySelector('.error')?.scrollIntoView({ block: 'center' }); }
});
document.addEventListener('keydown', event => {
  if (!discardOpen) return;
  if (event.key === 'Escape') { discardOpen = false; render(false); root.querySelector('[data-action="cancel"]').focus(); }
  if (event.key === 'Tab') {
    const buttons = [...root.querySelectorAll('.modal button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  }
});
render(false);
