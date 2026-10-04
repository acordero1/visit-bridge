import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechController } from '../src/speech.js';
import { createVisit, editInstruction, confirmVisit, selectLanguage, canShare } from '../src/visit.js';

function fixture({ availability = 'available', online = true, local = true } = {}) {
  const instances = [], states = [], texts = [], requests = [];
  let timeout;
  class Recognition {
    constructor() { if (local) this.processLocally = false; instances.push(this); }
    static async available(options) { requests.push(options); return availability; }
    static async install(options) { requests.push(options); availability = 'available'; return true; }
    start() { this.starts = (this.starts || 0) + 1; this.onstart?.(); }
    stop() { this.stopped = true; }
    abort() { this.aborted = true; }
  }
  const controller = createSpeechController({ environment: { SpeechRecognition: Recognition, isSecureContext: true, navigator: { onLine: online } },
    onState: state => states.push(state), onText: text => texts.push(text),
    schedule: callback => { timeout = callback; return 1; }, unschedule: () => { timeout = null; } });
  return { controller, instances, states, texts, requests, timeOut: () => timeout?.() };
}
const result = (text, final = true) => Object.assign([{ transcript: text }], { isFinal: final });

test('availability checks and recognition explicitly require local dictation', async () => {
  const f = fixture();
  await f.controller.check();
  assert.equal(f.controller.getState().status, 'ready');
  assert.deepEqual(f.requests[0], { langs: ['en-US'], processLocally: true, quality: 'dictation' });
  assert.equal(f.instances.some(instance => instance.starts), false);
  f.controller.start('');
  assert.equal(f.instances.at(-1).processLocally, true);
  assert.equal(f.instances.at(-1).continuous, false);
  f.controller.cancel();
});
test('a browser with recognition but no local property never starts or falls back', async () => {
  const f = fixture({ local: false });
  await f.controller.check(); f.controller.start('');
  assert.equal(f.controller.getState().status, 'unsupported');
  assert.equal(f.instances.some(instance => instance.starts), false);
  assert.equal(f.requests.length, 0);
});
test('interim words remain previews and final events do not duplicate accepted text', async () => {
  const f = fixture(); await f.controller.check(); f.controller.start('Worker text.');
  const mic = f.instances.at(-1);
  mic.onresult({ results: [result('Return Tuesday.', false)] });
  assert.equal(f.texts.length, 0);
  assert.equal(f.controller.getState().interim, 'Return Tuesday.');
  mic.onresult({ results: [result('Return Tuesday.')] });
  mic.onresult({ results: [result('Return Tuesday.')] });
  assert.deepEqual(f.texts, ['Worker text.\nReturn Tuesday.']);
  f.controller.stop(); assert.equal(mic.stopped, true);
  mic.onend(); assert.equal(f.controller.getState().status, 'review');
  f.controller.discard(); assert.equal(f.texts.at(-1), 'Worker text.');
});
test('leaving capture aborts the microphone and ignores late results', async () => {
  const f = fixture(); await f.controller.check(); f.controller.start('Existing text');
  const mic = f.instances.at(-1); f.controller.cancel();
  assert.equal(mic.aborted, true);
  mic.onresult({ results: [result('Late transcript')] });
  assert.equal(f.texts.length, 0);
  assert.equal(f.controller.isBusy(), false);
});
test('permission denial and timeout close recognition without automatic retries', async () => {
  const f = fixture(); await f.controller.check(); f.controller.start('');
  f.instances.at(-1).onerror({ error: 'not-allowed' });
  assert.equal(f.controller.getState().status, 'blocked');
  assert.equal(f.instances.at(-1).aborted, true);
  const count = f.instances.length; f.controller.start(''); assert.equal(f.instances.length, count);
  await f.controller.check(); f.controller.start(''); f.timeOut();
  assert.equal(f.controller.isBusy(), false);
  assert.equal(f.instances.at(-1).aborted, true);
});
test('oversized transcripts retain the last accepted words without silent truncation', async () => {
  const f = fixture(); await f.controller.check(); f.controller.start('Existing text');
  f.instances.at(-1).onresult({ results: [result('x'.repeat(1200))] });
  assert.equal(f.texts.length, 0);
  assert.equal(f.controller.getState().status, 'error');
  assert.equal(f.instances.at(-1).aborted, true);
});
test('speech-pack installation is explicit and does not open a microphone', async () => {
  const f = fixture({ availability: 'downloadable' }); await f.controller.check();
  assert.equal(f.controller.getState().status, 'downloadable');
  assert.equal(f.requests.length, 1);
  await f.controller.install();
  assert.equal(f.controller.getState().status, 'ready');
  assert.equal(f.instances.some(instance => instance.starts), false);
  const disconnected = fixture({ availability: 'downloadable', online: false });
  await disconnected.controller.check(); await disconnected.controller.install();
  assert.equal(disconnected.requests.length, 1);
});
test('dictated edits invalidate previous approval and cannot bypass worker review', async () => {
  let visit = selectLanguage(confirmVisit(editInstruction(createVisit(), 'Return Tuesday.'), true), 'en');
  const f = fixture(); await f.controller.check(); f.controller.start(visit.originalInstruction);
  f.instances.at(-1).onresult({ results: [result('Ask for the community nurse.')] });
  visit = editInstruction(visit, f.texts.at(-1));
  assert.equal(canShare(visit), false);
  assert.equal(visit.status, 'draft');
  f.controller.cancel();
});
test('privacy clearing removes interim and undo text and ignores late dictation',async()=>{
 const f=fixture();await f.controller.check();f.controller.start('Secret synthetic words');const mic=f.instances.at(-1);
 mic.onresult({results:[result('Another synthetic line')]});f.controller.clear();const count=f.texts.length;
 mic.onresult({results:[result('Late words')]});f.controller.discard();assert.equal(f.texts.length,count);
 assert.equal(f.controller.getState().interim,'');assert.equal(f.controller.getState().canDiscard,false);
});
