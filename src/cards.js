import { canShare, instructionError, LANGUAGES } from './visit.js';

export function cardFromVisit(visit) {
  if (!canShare(visit)) throw new Error('Review and confirm the instruction before saving it.');
  return { schemaVersion: 1, id: visit.id, instruction: visit.originalInstruction,
    language: visit.language, revision: visit.revision, approvedRevision: visit.approvedRevision,
    confirmedAt: visit.confirmedAt, createdAt: visit.createdAt, savedAt: new Date().toISOString() };
}

export function isValidCard(card) {
  return card?.schemaVersion === 1 && typeof card.id === 'string' && card.id.length > 0
    && typeof card.instruction === 'string' && !instructionError(card.instruction)
    && Number.isInteger(card.revision) && card.revision >= 0 && card.approvedRevision === card.revision
    && LANGUAGES.some(language => language.available && language.code === card.language)
    && ['confirmedAt', 'createdAt', 'savedAt'].every(key => typeof card[key] === 'string' && Number.isFinite(Date.parse(card[key])));
}

export async function saveApprovedCard(visit, repository) {
  const card = cardFromVisit(visit);
  if (!isValidCard(card)) throw new Error('This instruction needs to be reviewed again before saving.');
  await repository.save(card);
  return card;
}
