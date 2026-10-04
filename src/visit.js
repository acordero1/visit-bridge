export const MAX_INSTRUCTION_LENGTH = 1200;
export const LANGUAGES = [{ code: 'en', name: 'English', available: true }];

export function createVisit() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), originalInstruction: '', language: '',
    languageSource: null, status: 'draft', revision: 0, approvedRevision: null,
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
    status: 'draft', approvedRevision: null, confirmedAt: null, updatedAt: new Date().toISOString() };
}

export function selectLanguage(visit, code) {
  if (!LANGUAGES.some(language => language.available && language.code === code)) {
    throw new Error('Select an available patient language.');
  }
  return { ...visit, language: code, languageSource: 'worker-selected', updatedAt: new Date().toISOString() };
}

export function confirmVisit(visit, workerConfirmed) {
  const error = instructionError(visit.originalInstruction);
  if (error) throw new Error(error);
  if (!workerConfirmed) throw new Error('Review the instruction and confirm it is the next step you chose.');
  return { ...visit, status: 'confirmed', approvedRevision: visit.revision,
    confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function canShare(visit) {
  return visit.status === 'confirmed' && visit.approvedRevision === visit.revision
    && !instructionError(visit.originalInstruction)
    && LANGUAGES.some(language => language.available && language.code === visit.language);
}

export function patientInstruction(visit) {
  if (!canShare(visit)) throw new Error('Confirm the instruction and select a language before preparing the handoff.');
  // Preserve the worker's exact wording until a separately reviewed transformation exists.
  return visit.originalInstruction;
}
