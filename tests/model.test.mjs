import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelController } from '../src/model.js';
import { MODEL_MARKER, MODEL_REVISION } from '../src/model-config.js';

test('cancel terminates inference and suppresses stale results without replacing patient text', async () => {
  const originalWorker = globalThis.Worker, originalCaches = globalThis.caches;
  const workers = [], states = [], drafts = [];
  globalThis.caches = { open: async () => ({ match: async key => new Response(key===MODEL_MARKER?MODEL_REVISION:'installed') }) };
  globalThis.Worker = class { constructor() { workers.push(this); } postMessage(data) { this.data = data; } terminate() { this.terminated = true; } };
  const controller = createModelController({ onState: value => states.push(value), onDraft: value => drafts.push(value) });
  try {
    await controller.check();
    assert.equal(states.at(-1).installed, true);
    controller.generate({ originalInstruction: 'Return Tuesday.', revision: 2, language: 'en' });
    const first = workers[0];
    assert.equal(first.data.original, 'Return Tuesday.');
    controller.cancel();
    assert.equal(first.terminated, true);
    first.onmessage({ data: { type: 'draft', text: 'Late output', requestId: first.data.requestId } });
    assert.equal(drafts.length, 0);
    controller.generate({ originalInstruction: 'Return Wednesday.', revision: 3, language: 'en' });
    const next = workers[1];
    next.onmessage({ data: { type: 'draft', text: 'Return Wednesday.', requestId: next.data.requestId, revision: 3, language: 'en' } });
    assert.equal(drafts.length, 1);
    next.onmessage({ data: { type: 'state', status: 'installed', message: 'Ready' } });
  } finally { controller.cancel(); globalThis.Worker = originalWorker; globalThis.caches = originalCaches; }
});
test('incomplete cache is never described as installed', async () => {
  const old = globalThis.caches, oldWorker = globalThis.Worker;
  globalThis.Worker = class {};
  globalThis.caches = { open: async () => ({ match: async key => key === MODEL_MARKER ? undefined : new Response('partial') }) };
  const states = [];
  const controller = createModelController({ onState: value => states.push(value), onDraft() {} });
  try { await controller.check(); assert.equal(states.at(-1).installed, false); assert.equal(states.at(-1).status, 'missing'); }
  finally { controller.cancel(); globalThis.caches = old; globalThis.Worker = oldWorker; }
});
