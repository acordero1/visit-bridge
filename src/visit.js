import { approveHandoff, handoffReady, handoffText, wordingIssue, spanishHandoffSupported } from './handoff.js';
import { templateInstruction, validTemplate, validTranslation } from './templates.js';
export const MAX_INSTRUCTION_LENGTH = 1200;
export const LANGUAGES = [{ code: 'en', name: 'English', available: true }, { code: 'es', name: 'Español', available: true, demonstration: true }];

export function createVisit() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), originalInstruction: '', language: '',
    languageSource: null, handoff: null, template: null, translation: null, originalLanguage: 'en', status: 'draft', revision: 0, approvedRevision: null,
    patientText: '', patientTextRevision: 0, patientApprovedRevision: null, patientApprovedAt: null, patientTextOrigin: 'original', modelDraft: null,
    createdAt: now, updatedAt: now, confirmedAt: null };
}

export function instructionError(text) {
  if (!text.trim()) return 'Enter the next step you have already chosen for the patient.';
  if (text.length > MAX_INSTRUCTION_LENGTH) return `Keep the instruction to ${MAX_INSTRUCTION_LENGTH} characters or fewer.`;
  return '';
}

export function editInstruction(visit, text, force = false) {
  if (text === visit.originalInstruction && !force) return visit;
  return { ...visit, originalInstruction: text, revision: visit.revision + 1,
    status: 'draft', approvedRevision: null, confirmedAt: null, handoff: null, template: null, translation: null, language: visit.language === 'es' ? '' : visit.language, patientText: text, patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, patientTextOrigin: 'original', modelDraft: null, updatedAt: new Date().toISOString() };
}

export function selectLanguage(visit, code, pack = null) {
  if (!LANGUAGES.some(language => language.available && language.code === code)) throw new Error('Select an available patient language.');
  if (code === 'es') {
    if (!pack) throw new Error('Install the Spanish demonstration pack first.');
    if (!spanishHandoffSupported(visit.handoff, visit.template)) throw new Error('The Spanish pack cannot express these structured details. Keep English or use only the exact return-date-and-clinic template.');
    if (!validTemplate(visit.template) || visit.originalInstruction !== templateInstruction(visit.template)) throw new Error('Spanish supports the return-visit template only. Keep English or use that template to record the plan you chose.');
    const text = templateInstruction(visit.template, pack);
    const translation = { pack: structuredClone(pack), sourceRevision: visit.revision };
    return { ...visit, language: code, languageSource: 'worker-confirmed-patient-preference', patientText: text,
      patientTextOrigin: 'translation-template', patientTextRevision: visit.patientTextRevision + 1,
      patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null, translation, updatedAt: new Date().toISOString() };
  }
  if (visit.language === code) return visit;
  return { ...visit, language: code, languageSource: 'worker-confirmed-patient-preference', patientText: approvedPlanText(visit),
    patientTextOrigin: visit.handoff ? 'structured' : 'original', patientTextRevision: visit.patientTextRevision + 1,
    patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null, translation: null, updatedAt: new Date().toISOString() };
}
export function setReturnTemplate(visit, template) {
  const text = templateInstruction(template);
  // Changes to a slot require source review even when its rendered text is unchanged.
  const changed = editInstruction(visit, text);
  return { ...changed, handoff: null, template: { ...template }, language: '', languageSource: null, translation: null,
    status: 'draft', approvedRevision: null, confirmedAt: null, patientText: text, patientTextOrigin: 'original',
    patientTextRevision: changed.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null };
}

export function confirmVisit(visit, workerConfirmed) {
  const error = instructionError(visit.originalInstruction);
  if (error) throw new Error(error);
  if (!workerConfirmed) throw new Error('Review the instruction and confirm it is the next step you chose.');
  const handoff = visit.handoff ? approveHandoff(visit.handoff, visit.revision) : null;
  const text = handoff ? handoffText(handoff) : visit.originalInstruction;
  if (instructionError(text)) throw new Error('Keep the complete structured plan to 1200 characters or fewer.');
  return { ...visit, handoff, language: visit.language==='es'?'':visit.language, translation: null, patientText: text, patientTextOrigin: handoff ? 'structured' : 'original',
    patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null,
    status: 'confirmed', approvedRevision: visit.revision,
    confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function sourceConfirmed(visit) {
  return visit.status === 'confirmed' && visit.approvedRevision === visit.revision
    && handoffReady(visit.handoff, visit.revision)
    && !instructionError(visit.originalInstruction)
    && LANGUAGES.some(language => language.available && language.code === visit.language);
}

export function patientInstruction(visit) {
  if (!canShare(visit)) throw new Error('Confirm the instruction and select a language before preparing the handoff.');
  return visit.patientText;
}

export function setPatientText(visit, text, origin = 'worker-edited') {
  if (visit.language === 'es') throw new Error('Edit the return-visit details in Capture, then review both versions again.');
  if (text === visit.patientText && origin === visit.patientTextOrigin) return visit;
  return { ...visit, patientText: text, patientTextOrigin: origin,
    patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null,
    patientApprovedAt: null, updatedAt: new Date().toISOString() };
}
export function confirmPatientText(visit, workerConfirmed) {
  if (!sourceConfirmed(visit)) throw new Error('Confirm the original instruction and select the patient language first.');
  if (visit.language === 'es' && (!validTranslation(visit.translation, visit.template, visit.originalInstruction, visit.patientText) || visit.translation.sourceRevision !== visit.revision)) throw new Error('The translated template no longer matches the original. Review it again.');
  const problem = instructionError(visit.patientText); if (problem) throw new Error(problem);
  if (visit.language === 'en') { const issue = wordingIssue(visit.handoff, visit.patientText); if (issue) throw new Error(issue); }
  if (!workerConfirmed) throw new Error('Check the patient wording against your original and confirm that the meaning is unchanged.');
  return { ...visit, patientApprovedRevision: visit.patientTextRevision, patientApprovedAt: new Date().toISOString() };
}
export function canShare(visit) {
  return sourceConfirmed(visit) && !instructionError(visit.patientText)
    && (visit.language !== 'en' || !wordingIssue(visit.handoff, visit.patientText))
    && (visit.language !== 'es' || spanishHandoffSupported(visit.handoff, visit.template))
    && (visit.language === 'en' ? visit.translation === null : visit.translation?.sourceRevision === visit.revision && validTranslation(visit.translation, visit.template, visit.originalInstruction, visit.patientText))
    && visit.patientApprovedRevision === visit.patientTextRevision && Boolean(visit.patientApprovedAt);
}
export const visitStamp = visit => `${visit.revision}:${visit.patientTextRevision}:${visit.language}:${visit.translation?.pack.version || ''}:${visit.handoff?.revision ?? 'source'}`;

export function approvedPlanText(visit) { return visit.handoff ? handoffText(visit.handoff) : visit.originalInstruction; }
export function setStructuredHandoff(visit, handoff) {
  if (handoff && handoff.sourceRevision !== visit.revision) throw new Error('This structured draft belongs to an older source.');
  return { ...visit, handoff, status: 'draft', approvedRevision: null, confirmedAt: null,
    language: '', languageSource: null, translation: null, patientText: visit.originalInstruction, patientTextOrigin: 'original',
    patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null, updatedAt: new Date().toISOString() };
}
