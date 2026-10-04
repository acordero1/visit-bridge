import { validTemplate, validTranslation, templateInstruction } from './templates.js';
import { canShare, instructionError, LANGUAGES } from './visit.js';

export function cardFromVisit(visit) {
  if (!canShare(visit)) throw new Error('Review and confirm the instruction before saving it.');
  return { schemaVersion: 3, id: visit.id, instruction: visit.patientText, originalLanguage: 'en', template: visit.template ? structuredClone(visit.template) : null, translation: visit.translation ? structuredClone(visit.translation) : null, originalInstruction: visit.originalInstruction,
    patientTextRevision: visit.patientTextRevision, patientApprovedRevision: visit.patientApprovedRevision,
    patientApprovedAt: visit.patientApprovedAt, patientTextOrigin: visit.patientTextOrigin, modelDraft: visit.modelDraft,
    language: visit.language, revision: visit.revision, approvedRevision: visit.approvedRevision,
    confirmedAt: visit.confirmedAt, createdAt: visit.createdAt, savedAt: new Date().toISOString() };
}

export function isValidCard(card) {
  return [1, 2, 3].includes(card?.schemaVersion) && typeof card.id === 'string' && card.id.length > 0
    && typeof card.instruction === 'string' && !instructionError(card.instruction)
    && Number.isInteger(card.revision) && card.revision >= 0 && card.approvedRevision === card.revision
    && LANGUAGES.some(language => language.available && language.code === card.language)
    && (card.schemaVersion === 3 || card.language === 'en')
    && (card.schemaVersion !== 3 || (card.originalLanguage === 'en'
      && (card.template === null || (validTemplate(card.template) && card.originalInstruction === templateInstruction(card.template)))
      && (card.language === 'en' ? card.translation === null : card.patientTextOrigin === 'translation-template'
        && card.translation?.sourceRevision === card.revision && validTranslation(card.translation, card.template, card.originalInstruction, card.instruction))))
    && (card.schemaVersion === 1 || (typeof card.originalInstruction === 'string' && !instructionError(card.originalInstruction)
      && Number.isInteger(card.patientTextRevision) && card.patientTextRevision >= 0 && card.patientApprovedRevision === card.patientTextRevision
      && typeof card.patientApprovedAt === 'string' && Number.isFinite(Date.parse(card.patientApprovedAt))
      && ['original', 'model', 'worker-edited', ...(card.schemaVersion === 3 ? ['translation-template'] : [])].includes(card.patientTextOrigin)
      && (card.modelDraft === null || (typeof card.modelDraft?.text === 'string' && !instructionError(card.modelDraft.text)
        && card.modelDraft.revision === card.revision && card.modelDraft.language === card.language
        && typeof card.modelDraft.model === 'string' && typeof card.modelDraft.modelRevision === 'string'))))
    && ['confirmedAt', 'createdAt', 'savedAt'].every(key => typeof card[key] === 'string' && Number.isFinite(Date.parse(card[key])));
}

export async function saveApprovedCard(visit, repository) {
  const card = cardFromVisit(visit);
  if (!isValidCard(card)) throw new Error('This instruction needs to be reviewed again before saving.');
  await repository.save(card);
  return card;
}
