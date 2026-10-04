export const MAX_INSTRUCTION_LENGTH = 1200;
export const LANGUAGES = [{ code: 'en', name: 'English', available: true }];

export function createVisit() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), originalInstruction: '', language: '',
    languageSource: null, status: 'draft', revision: 0, approvedRevision: null,
    patientText: '', patientTextRevision: 0, patientApprovedRevision: null, patientApprovedAt: null, patientTextOrigin: 'original', modelDraft: null,
    createdAt: now, updatedAt: now, confirmedAt: null };
}

export function instructionError(text) {
  if (!text.trim()) return 'Enter the next step you have already chosen for the patient.';
  if (text.length > MAX_INSTRUCTION_LENGTH) return `Keep the instruction to ${MAX_INSTRUCTION_LENGTH} characters or fewer.`;
  return '';
}

export function editInstruction(visit, text) {
  if (text === visit.originalInstruction) return visit;
  return { ...visit, originalInstruction: text, revision: visit.revision + 1,
    status: 'draft', approvedRevision: null, confirmedAt: null, patientText: text, patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null, patientApprovedAt: null, patientTextOrigin: 'original', modelDraft: null, updatedAt: new Date().toISOString() };
}

export function selectLanguage(visit, code) {
  if (!LANGUAGES.some(language => language.available && language.code === code)) {
    throw new Error('Select an available patient language.');
  }
  return { ...visit, ...(visit.language !== code ? { patientApprovedRevision: null, patientApprovedAt: null, modelDraft: null } : {}), language: code, languageSource: 'worker-selected', updatedAt: new Date().toISOString() };
}

export function confirmVisit(visit, workerConfirmed) {
  const error = instructionError(visit.originalInstruction);
  if (error) throw new Error(error);
  if (!workerConfirmed) throw new Error('Review the instruction and confirm it is the next step you chose.');
  return { ...visit, status: 'confirmed', approvedRevision: visit.revision,
    confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function sourceConfirmed(visit) {
  return visit.status === 'confirmed' && visit.approvedRevision === visit.revision
    && !instructionError(visit.originalInstruction)
    && LANGUAGES.some(language => language.available && language.code === visit.language);
}

export function patientInstruction(visit) {
  if (!canShare(visit)) throw new Error('Confirm the instruction and select a language before preparing the handoff.');
  return visit.patientText;
}

export function setPatientText(visit, text, origin = 'worker-edited') {
  if (text === visit.patientText && origin === visit.patientTextOrigin) return visit;
  return { ...visit, patientText: text, patientTextOrigin: origin,
    patientTextRevision: visit.patientTextRevision + 1, patientApprovedRevision: null,
    patientApprovedAt: null, updatedAt: new Date().toISOString() };
}
export function confirmPatientText(visit, workerConfirmed) {
  if (!sourceConfirmed(visit)) throw new Error('Confirm the original instruction and select English first.');
  const problem = instructionError(visit.patientText); if (problem) throw new Error(problem);
  if (!workerConfirmed) throw new Error('Check the patient wording against your original and confirm that the meaning is unchanged.');
  return { ...visit, patientApprovedRevision: visit.patientTextRevision, patientApprovedAt: new Date().toISOString() };
}
export function canShare(visit) {
  return sourceConfirmed(visit) && !instructionError(visit.patientText)
    && visit.patientApprovedRevision === visit.patientTextRevision && Boolean(visit.patientApprovedAt);
}
export const visitStamp = visit => `${visit.revision}:${visit.patientTextRevision}`;
