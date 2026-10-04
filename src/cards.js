import { bindReplayMarker, validReplayMarker } from './marker-data.js';
import { validConsent, permitted, createConsent } from './consent.js';
import { validUnderstanding, currentUnderstanding } from './understanding.js';
import { validHandoff, wordingIssue, spanishHandoffSupported } from './handoff.js';
import { validTemplate, validTranslation, templateInstruction } from './templates.js';
import { canShare, instructionError, LANGUAGES } from './visit.js';

export function cardFromVisit(visit) {
  if (!canShare(visit)) throw new Error('Review and confirm the instruction before saving it.');
  return { schemaVersion: 7, replayMarker:null, consent: structuredClone(visit.consent || createConsent()), understanding: currentUnderstanding(visit) ? structuredClone(visit.understanding) : null, handoff: visit.handoff ? structuredClone(visit.handoff) : null, id: visit.id, instruction: visit.patientText, originalLanguage: visit.originalLanguage, template: visit.template ? structuredClone(visit.template) : null, translation: visit.translation ? structuredClone(visit.translation) : null, originalInstruction: visit.originalInstruction,
    patientTextRevision: visit.patientTextRevision, patientApprovedRevision: visit.patientApprovedRevision,
    patientApprovedAt: visit.patientApprovedAt, patientTextOrigin: visit.patientTextOrigin, modelDraft: visit.modelDraft,
    language: visit.language, revision: visit.revision, approvedRevision: visit.approvedRevision,
    confirmedAt: visit.confirmedAt, createdAt: visit.createdAt, savedAt: new Date().toISOString() };
}

export function isValidCard(card) {
  return [1, 2, 3, 4, 5, 6, 7].includes(card?.schemaVersion) && typeof card.id === 'string' && card.id.length > 0
    && typeof card.instruction === 'string' && !instructionError(card.instruction)
    && Number.isInteger(card.revision) && card.revision >= 0 && card.approvedRevision === card.revision
    && LANGUAGES.some(language => language.available && language.code === card.language)
    && (card.schemaVersion >= 3 || card.language === 'en')
    && (card.schemaVersion < 3 || (card.originalLanguage === 'en'
      && (card.template === null || (validTemplate(card.template) && card.originalInstruction === templateInstruction(card.template)))
      && (card.language === 'en' ? card.translation === null : card.patientTextOrigin === 'translation-template'
        && card.translation?.sourceRevision === card.revision && validTranslation(card.translation, card.template, card.originalInstruction, card.instruction))))
    && (card.schemaVersion === 1 || (typeof card.originalInstruction === 'string' && !instructionError(card.originalInstruction)
      && Number.isInteger(card.patientTextRevision) && card.patientTextRevision >= 0 && card.patientApprovedRevision === card.patientTextRevision
      && typeof card.patientApprovedAt === 'string' && Number.isFinite(Date.parse(card.patientApprovedAt))
      && ['original', 'model', 'worker-edited', ...(card.schemaVersion >= 4 ? ['structured'] : []), ...(card.schemaVersion >= 3 ? ['translation-template'] : [])].includes(card.patientTextOrigin)
      && (card.modelDraft === null || (typeof card.modelDraft?.text === 'string' && !instructionError(card.modelDraft.text)
        && card.modelDraft.revision === card.revision && card.modelDraft.language === card.language
        && typeof card.modelDraft.model === 'string' && typeof card.modelDraft.modelRevision === 'string'))))
    && (card.schemaVersion < 4 || card.patientTextOrigin !== 'structured' || card.handoff !== null)
    && (card.schemaVersion < 4 || card.handoff === null || (validHandoff(card.handoff, card.originalInstruction, card.revision)
      && (card.language === 'en' ? !wordingIssue(card.handoff, card.instruction) : spanishHandoffSupported(card.handoff, card.template))))
    && (card.schemaVersion < 5 || (Object.hasOwn(card, 'understanding') && validUnderstanding(card.understanding, card)))
    && (card.schemaVersion < 6 || validConsent(card.consent))
    && (card.schemaVersion < 7 || (Object.hasOwn(card,'replayMarker') && validReplayMarker(card.replayMarker,card)))
    && ['confirmedAt', 'createdAt', 'savedAt'].every(key => typeof card[key] === 'string' && Number.isFinite(Date.parse(card[key])));
}

export async function saveApprovedCard(visit, repository) {
  if (!permitted(visit, 'storage')) throw new Error('Record permission to save this card first. Showing the card does not require saving.');
  const raw = cardFromVisit(visit);
  const previous = repository.list ? (await repository.list()).find(card=>card.id===raw.id) : null;
  const card = bindReplayMarker(raw,previous);
  if (!isValidCard(card)) throw new Error('This instruction needs to be reviewed again before saving.');
  await repository.save(card);
  return card;
}
