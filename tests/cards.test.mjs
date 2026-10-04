import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisit, editInstruction, selectLanguage, confirmPatientText, confirmVisit } from '../src/visit.js';
import { cardFromVisit, isValidCard, saveApprovedCard } from '../src/cards.js';

const approved = () => confirmPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(), 'Return Tuesday.\nAsk for the community nurse.'), true), 'en'), true);
test('only approved selected-language instructions reach storage', async () => {
  let writes = 0;
  const repository = { save: async () => { writes++; } };
  await assert.rejects(saveApprovedCard(createVisit(), repository));
  await assert.rejects(saveApprovedCard(editInstruction(approved(), 'Changed instruction'), repository));
  assert.equal(writes, 0);
});
test('saved copy preserves approval, wording and revision without extra patient data', async () => {
  const visit = approved();
  let stored;
  const card = await saveApprovedCard(visit, { save: async value => { stored = structuredClone(value); } });
  assert.equal(card.instruction, visit.originalInstruction);
  assert.equal(stored.approvedRevision, visit.revision);
  assert.equal(stored.confirmedAt, visit.confirmedAt);
  assert.equal(isValidCard(stored), true);
  assert.equal('patientName' in stored, false);
  const edited = editInstruction(visit, 'Return Wednesday.');
  assert.notEqual(stored.instruction, edited.originalInstruction);
});
test('failed storage never returns a successful save', async () => {
  await assert.rejects(saveApprovedCard(approved(), { save: async () => { throw new Error('Quota exceeded'); } }), /Quota exceeded/);
});
test('corrupt or unapproved stored cards are rejected', () => {
  const card = cardFromVisit(approved());
  assert.equal(isValidCard({ ...card, approvedRevision: card.revision + 1 }), false);
  assert.equal(isValidCard({ ...card, instruction: '' }), false);
  assert.equal(isValidCard({ ...card, confirmedAt: null }), false);
  assert.equal(isValidCard({ ...card, language: 'unsupported' }), false);
});
