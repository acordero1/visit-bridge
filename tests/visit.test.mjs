import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisit, editInstruction, confirmVisit, selectLanguage, confirmPatientText, canShare, patientInstruction, instructionError } from '../src/visit.js';

test('sharing requires worker confirmation and an available selected language', () => {
  let visit = editInstruction(createVisit(), 'Return to the clinic on Tuesday.');
  assert.equal(canShare(visit), false);
  assert.throws(() => confirmVisit(visit, false));
  visit = confirmVisit(visit, true);
  assert.equal(canShare(visit), false);
  visit = selectLanguage(visit, 'en');
  assert.equal(canShare(visit), false);
  visit = confirmPatientText(visit, true);
  assert.equal(canShare(visit), true);
  assert.equal(patientInstruction(visit), visit.originalInstruction);
});
test('changing an approved instruction revokes approval and prevents sharing', () => {
  const visit = selectLanguage(confirmVisit(editInstruction(createVisit(), 'Return Tuesday.'), true), 'en');
  const edited = editInstruction(visit, 'Return Wednesday.');
  assert.equal(edited.status, 'draft');
  assert.equal(edited.approvedRevision, null);
  assert.equal(canShare(edited), false);
  assert.throws(() => patientInstruction(edited));
  assert.equal(canShare(confirmPatientText(confirmVisit(edited, true), true)), true);
});
test('empty, oversized and unsupported language input is rejected', () => {
  assert.ok(instructionError('  \n '));
  assert.ok(instructionError('x'.repeat(1201)));
  assert.throws(() => confirmVisit(createVisit(), true));
  assert.throws(() => selectLanguage(createVisit(), 'unsupported'));
});
test('patient text preserves exact worker wording without adding instructions', () => {
  const original = '  Return Tuesday.\nAsk for the community nurse.  ';
  const visit = selectLanguage(confirmVisit(editInstruction(createVisit(), original), true), 'en');
  assert.equal(patientInstruction(confirmPatientText(visit, true)), original);
});
