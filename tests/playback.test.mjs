import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackController } from '../src/playback.js';
import { cardFromVisit } from '../src/cards.js';
import { createVisit, editInstruction, selectLanguage, confirmVisit, confirmPatientText, setPatientText } from '../src/visit.js';

const approved = () => cardFromVisit(confirmPatientText(setPatientText(selectLanguage(confirmVisit(editInstruction(createVisit(), 'Return to the clinic on Tuesday.'), true), 'en'), 'Please come back to the clinic on Tuesday.'), true));
const localVoice = { name: 'Device English', voiceURI: 'device-en', lang: 'en-US', localService: true, default: true };
function fixture(initialVoices = [localVoice]) {
  let voices = initialVoices, current;
  const spoken = [], states = [], listeners = new Map(), timers = new Map();
  let nextTimer = 0, cancellations = 0;
  const engine = {
    getVoices: () => voices, paused: false,
    speak(utterance) { current = utterance; spoken.push(utterance); },
    cancel() { cancellations++; },
    pause() { this.paused = true; current.onpause(); },
    resume() { this.paused = false; current?.onresume(); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const controller = createPlaybackController({ environment: { speechSynthesis: engine, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } },
    onState: state => states.push(state), schedule: callback => { const id = ++nextTimer; timers.set(id, callback); return id; }, unschedule: id => timers.delete(id) });
  return { controller, spoken, states, engine, timers, listeners, cancellations: () => cancellations,
    changeVoices(next) { voices = next; listeners.get('voiceschanged')?.(); } };
}
test('voice discovery never speaks; only final approved words reach the local voice', () => {
  const f = fixture(); f.controller.check();
  assert.equal(f.spoken.length, 0); assert.equal(f.states.at(-1).available, true);
  const card = approved(); f.controller.play(card);
  assert.equal(f.spoken[0].text, card.instruction);
  assert.notEqual(f.spoken[0].text, card.originalInstruction);
  assert.equal(f.spoken[0].voice, localVoice);
  f.spoken[0].onstart(); assert.equal(f.states.at(-1).status, 'speaking');
  f.spoken[0].onend(); assert.equal(f.states.at(-1).status, 'ended');
  assert.equal(f.timers.size, 0); f.controller.destroy();
});
test('remote, unspecified and non-English voices never receive patient text', () => {
  for (const voice of [{ ...localVoice, localService: false }, { ...localVoice, localService: undefined }, { ...localVoice, lang: 'es-ES' }]) {
    const f = fixture([voice]); f.controller.check(); f.controller.play(approved());
    assert.equal(f.spoken.length, 0); assert.equal(f.states.at(-1).available, false); f.controller.destroy();
  }
});
test('unapproved snapshots cannot be spoken; legacy approved cards can', () => {
  const f = fixture(), card = approved();
  f.controller.play({ ...card, patientApprovedRevision: null });
  f.controller.play({ ...card, approvedRevision: null });
  assert.equal(f.spoken.length, 0);
  f.controller.play({ schemaVersion: 1, id: card.id, instruction: card.originalInstruction, revision: card.revision, approvedRevision: card.approvedRevision, language: 'en', confirmedAt: card.confirmedAt, createdAt: card.createdAt, savedAt: card.savedAt });
  assert.equal(f.spoken[0].text, card.originalInstruction); f.controller.destroy();
});
test('stop and card replacement ignore stale utterance events', () => {
  const f = fixture(); f.controller.play(approved()); const first = f.spoken[0];
  first.onstart(); f.controller.stop();
  assert.equal(f.cancellations(), 1); assert.equal(f.controller.isBusy(), false);
  first.onerror(); first.onend(); first.onstart();
  assert.equal(f.states.at(-1).status, 'ready');
  f.controller.play(approved()); const second = f.spoken[1];
  f.controller.play(approved()); second.onend();
  assert.equal(f.states.at(-1).status, 'starting'); f.controller.destroy();
});
test('pause/resume retain exact wording and a paused stop does not leave the engine paused', () => {
  const f = fixture(); f.controller.play(approved()); const utterance = f.spoken[0]; utterance.onstart();
  f.controller.pause(); assert.equal(f.states.at(-1).status, 'paused'); assert.equal(f.timers.size, 0);
  f.controller.resume(); assert.equal(f.states.at(-1).status, 'speaking'); assert.equal(f.spoken.length, 1);
  f.controller.pause(); f.controller.stop(); assert.equal(f.engine.paused, false); assert.equal(f.states.at(-1).status, 'ready');
  assert.equal(f.spoken.length, 1); f.controller.destroy();
});
test('late voice availability never starts audio, and loss of a local voice stops playback', () => {
  const f = fixture([]); f.controller.check();
  for (const callback of f.timers.values()) callback();
  assert.equal(f.states.at(-1).status, 'unavailable');
  f.changeVoices([localVoice]); assert.equal(f.states.at(-1).status, 'ready'); assert.equal(f.spoken.length, 0);
  f.controller.play(approved()); f.spoken[0].onstart(); f.changeVoices([{ ...localVoice, localService: false }]);
  assert.equal(f.cancellations(), 1); assert.equal(f.controller.isBusy(), false); f.controller.destroy();
});
test('startup failure and unsupported browser leave the card readable', () => {
  const f = fixture(); f.controller.play(approved());
  for (const callback of [...f.timers.values()]) callback();
  assert.equal(f.states.at(-1).status, 'error'); assert.equal(f.cancellations(), 1); f.controller.destroy();
  let state;
  const absent = createPlaybackController({ environment: {}, onState: value => { state = value; } });
  absent.check(); assert.equal(state.status, 'unavailable'); absent.play(approved()); assert.equal(state.available, false); absent.destroy();
});
