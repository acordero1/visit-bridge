import test from 'node:test';
import assert from 'node:assert/strict';
import { draftError } from '../src/wording.js';
import { createVisit, editInstruction, selectLanguage, confirmVisit, confirmPatientText, setPatientText, canShare } from '../src/visit.js';
import { cardFromVisit, isValidCard } from '../src/cards.js';
const approvedSource = () => selectLanguage(confirmVisit(editInstruction(createVisit(), 'Return to the clinic on Tuesday.'), true), 'en');
test('model checks reject changed dates, quantities, cautions and invented actions', () => {
  assert.ok(draftError('Return Tuesday.', 'Return Wednesday.'));
  assert.ok(draftError('Bring 2 cards.', 'Bring 3 cards.'));
  assert.ok(draftError('Do not take medicine.', 'Take medicine.'));
  assert.ok(draftError('Return to the clinic.', 'Return to the clinic and take antibiotics.'));
  assert.equal(draftError('Return to the clinic on Tuesday.', 'Please return to the clinic on Tuesday.'), '');
});
test('patient wording has separate approval, revoked by source or final edits', () => {
  let visit = approvedSource();
  assert.equal(canShare(visit), false);
  assert.throws(() => confirmPatientText(visit, false));
  visit = confirmPatientText(setPatientText(visit, 'Please return to the clinic on Tuesday.'), true);
  assert.equal(canShare(visit), true);
  assert.equal(canShare(setPatientText(visit, 'Return Tuesday.')), false);
  assert.equal(canShare(editInstruction(visit, 'Return Wednesday.')), false);
  const card = cardFromVisit(visit);
  assert.equal(card.originalInstruction, 'Return to the clinic on Tuesday.');
  assert.equal(card.instruction, 'Please return to the clinic on Tuesday.');
  assert.ok(isValidCard(card));
  assert.equal(isValidCard({ ...card, patientApprovedRevision: 999 }), false);
});
test('legacy v1 approved cards remain readable', () => {
  const card = cardFromVisit(confirmPatientText(approvedSource(), true));
  const legacy = { schemaVersion: 1, id: card.id, instruction: card.originalInstruction, language: card.language, revision: card.revision, approvedRevision: card.approvedRevision, confirmedAt: card.confirmedAt, createdAt: card.createdAt, savedAt: card.savedAt };
  assert.equal(isValidCard(legacy), true);
});
