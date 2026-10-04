import { approvedPlanText } from './visit.js';
import { modelInstalled } from './model-config.js';
export function createModelController({ onState, onDraft }) {
  let worker, timer, activeId = 0;
  let status = 'checking'; let installed = false;
  const publish = (next, message) => { status = next; onState({ status, message, installed }); };
  const cancel = () => {
    activeId++; clearTimeout(timer); worker?.terminate(); worker = null;
    publish(installed ? 'installed' : 'missing', installed ? 'Local AI installed. Ready to draft on this device.' : 'Local AI is optional. Use your original wording or install the pack.');
  };
  function start(data) {
    if (['installing','loading','generating'].includes(status)) return;
    try { worker ||= new Worker(new URL('./model-worker.js', import.meta.url), { type: 'module' }); }
    catch { publish('error', 'This browser could not start local AI. Use your original wording.'); return; }
    const id = ++activeId;
    worker.onmessage = ({ data: result }) => {
      if (id !== activeId) return;
      if (result.type === 'state') { if (result.status === 'installed') { installed = true; clearTimeout(timer); } publish(result.status, result.message); }
      else if (['draft','rejected','extraction','extraction-rejected'].includes(result.type) && result.requestId === id) onDraft(result);
      else if (result.type === 'error') { clearTimeout(timer); worker.terminate(); worker = null; publish('error', result.message.length > 190 ? 'The local model could not run. Use your original wording or try again.' : result.message); }
    };
    worker.onerror = () => { clearTimeout(timer); worker?.terminate(); worker = null; publish('error', 'Local AI could not run in this browser. Use your original wording.'); };
    publish(data.type === 'install' ? 'installing' : 'loading', data.type === 'install' ? 'Starting optional AI pack installation…' : 'Starting on-device draft…');
    timer = setTimeout(() => { cancel(); publish('error', 'Local AI timed out. Use your original wording or try again.'); }, data.type === 'install' ? 600000 : 120000);
    worker.postMessage({ ...data, requestId: id });
  }
  return { cancel, install: () => start({ type: 'install' }), generate: visit => start({ type: 'generate', original: approvedPlanText(visit), revision: visit.revision, language: visit.language }),
    extract: visit => start({ type: 'extract', original: visit.originalInstruction, revision: visit.revision, workflow: visit.handoff?.workflow || 'other', handoffRevision: visit.handoff?.revision ?? 0 }),
    async check() {
      const checkId = activeId;
      try { if (!globalThis.Worker || !globalThis.caches || !globalThis.WebAssembly) return publish('unsupported', 'This browser cannot run the local AI pack. Use your original wording.');
        const found = await modelInstalled(); if (checkId !== activeId) return; installed = found; publish(installed ? 'installed' : 'missing', installed ? 'Local AI installed. Ready to draft on this device.' : 'Optional download: about 207 MB including the model and runtime.');
      } catch { if (checkId === activeId) publish('error', 'Local AI storage is unavailable. Use your original wording.'); }
    } };
}
