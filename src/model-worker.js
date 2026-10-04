import { parseExtraction, extractionScopeIssue } from './handoff.js';
import { MODEL_ID, MODEL_REVISION, modelInstalled, activeModelCache } from './model-config.js';
import { draftError } from './wording.js';
let generator;
const state = (status, message) => self.postMessage({ type: 'state', status, message });
async function loadGenerator() {
  if (!await modelInstalled()) throw new Error('Install the local AI pack first. Your original wording is still available.');
  state('loading', 'Loading the local model into memory…');
  if (!generator) {
    const { pipeline, env } = await import('../vendor/transformers.min.js');
    env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = '/models/';
    env.useBrowserCache = false; env.useFSCache = false; env.useCustomCache = true;
    const cache = await caches.open(await activeModelCache());
    env.customCache = { match: key => cache.match(key), put: async () => {} };
    env.backends.onnx.wasm.wasmPaths = '/vendor/'; env.backends.onnx.wasm.numThreads = 1;
    generator = await pipeline('text-generation', MODEL_ID, { dtype: 'q4', device: 'wasm', revision: MODEL_REVISION, local_files_only: true });
  }
}
async function generate({ original, requestId, revision, language }) {
  if (language !== 'en' || !original.trim() || original.length > 1200) throw new Error('Review an English instruction before requesting a draft.');
  await loadGenerator();
  state('generating', 'Drafting on this device. Your instruction is not sent to a server…');
  const prompt = `Rewrite each instruction in simple English. Keep its details.
Original: Please attend the clinic on Friday.
Simple: Please come to the clinic on Friday.
Original: Kindly bring your appointment card.
Simple: Bring your appointment card.
Original: Return to the community nurse in 2 days.
Simple: Come back to the community nurse in 2 days.
Original: ${original}
Simple:`;
  const result = await generator(prompt, { max_new_tokens: 80, do_sample: false, return_full_text: false });
  // Few-shot completion may continue with another example. Only the first answer line is requested.
  const text = (result[0]?.generated_text || '').trim().split('\n')[0].trim().replace(/^"(.*)"$/, '$1');
  const problem = draftError(original, text); if (problem) { self.postMessage({ type: 'rejected', text, requestId, revision, language, message: problem }); state('installed', problem); return; }
  self.postMessage({ type: 'draft', text, requestId, revision, language, model: MODEL_ID, modelRevision: MODEL_REVISION });
  state('installed', 'Draft ready for your review. Check it against the original.');
}
self.onmessage = async ({ data }) => {
  try { if (data.type === 'generate') await generate(data); else if (data.type === 'extract') await extract(data); }
  catch (error) { self.postMessage({ type: 'error', message: error.message || 'Local AI could not run. Keep your original wording.' }); }
};

async function extract({ original, requestId, revision, workflow, handoffRevision }) {
  if (typeof original !== 'string' || !original.trim() || original.length > 1200) throw new Error('Enter a short administrative source note first.');
  const scope = extractionScopeIssue(original); if (scope) throw new Error(scope);
  await loadGenerator();
  state('generating', 'Organizing your note on this device. Every proposed field needs review…');
  // Short independent copy tasks are less demanding than a seven-field JSON completion.
  // Unsupported answers become explicit unresolved fields; they never become facts.
  const examples = {
    action: ['next action', 'Return', 'Call'], date: ['calendar date or relative date', '2026-10-06', 'NONE'],
    time: ['time', 'NONE', 'NONE'], place: ['destination', 'the clinic', 'the reception desk'],
    item: ['item to bring', 'your appointment slip', 'NONE'], task: ['additional administrative task', 'NONE', 'NONE'],
    reported: ['patient-reported information', 'NONE', 'NONE']
  };
  const values = {}, unresolved = [];
  for (const [key, [label, first, second]] of Object.entries(examples)) {
    state('generating', `Organizing ${label} on this device…`);
    const messages = [
      { role: 'system', content: `Copy only the ${label} from the user's note. Your entire answer must be an exact substring of the note, or NONE when absent. No explanation. No paraphrasing. No invented facts.` },
      { role: 'user', content: `What is the ${label}? Note: Return to the clinic on 2026-10-06. Bring your appointment slip.` },
      { role: 'assistant', content: first },
      { role: 'user', content: `What is the ${label}? Note: Call the reception desk.` },
      { role: 'assistant', content: second },
      { role: 'user', content: `What is the ${label}? Note: ${original}` }
    ];
    const result = await generator(messages, { max_new_tokens: 45, do_sample: false, return_full_text: false });
    const generated = result[0]?.generated_text;
    const text = typeof generated === 'string' ? generated : generated?.at(-1)?.content || '';
    const answer = text.trim().split('\n')[0].trim().replace(/^"(.*)"$/, '$1');
    if (answer === 'NONE' || answer === 'null') values[key] = null;
    else if (answer && answer.length <= 240 && original.includes(answer)) values[key] = answer;
    else { values[key] = null; unresolved.push(key); }
  }
  const text = JSON.stringify(values);
  try {
    const handoff = parseExtraction(text, original, revision, workflow, { id: MODEL_ID, revision: MODEL_REVISION });
    for (const key of unresolved) handoff.fields[key].state = 'unclear';
    self.postMessage({ type: 'extraction', requestId, revision, handoffRevision, handoff });
    state('installed', Object.values(handoff.fields).some(field => field.state === 'unclear') ? 'Proposal ready with unresolved fields. Enter or clarify those details yourself.' : 'Organized proposal ready. Review every field against the source before using it.');
  } catch (error) {
    self.postMessage({ type: 'extraction-rejected', requestId, revision, handoffRevision, text: text.slice(0,2400), message: error.message });
    state('installed', 'The extraction was rejected. Your manual details remain available.');
  }

}
