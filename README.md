# Visit Bridge

Visit Bridge helps a frontline health worker turn an instruction they have already chosen into a simple patient handoff. This prototype addresses World Bank Challenge 4a: Small AI for development, Health.

## Run locally

Requires Node.js 20 or later. There are no dependencies to install.

```sh
npm run dev
```

Open http://127.0.0.1:5173. `npm start` runs the same local server. Set `PORT` to change the port. The server binds to the local device by default; a future phone demo can explicitly set `HOST=0.0.0.0` on a trusted network.

```sh
npm run check
npm test
```

If Node is not on your PATH in Codex, the bundled runtime used for this checkpoint is `/Users/acordero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. Run that executable with `scripts/serve.mjs`, directly for verification too: `node --check src/app.js` and `node --test tests/*.test.mjs` (substitute the full executable path). The bundled runtime here does not include npm; a normal Node installation includes it.

## Checkpoints

First checkpoint: foundation

The responsive application includes overview, capture, worker review, language selection, patient preview, and a prepared care card. Try the built-in sample, confirm it, select English, and prepare the card. Finish clears the visit; cancellation asks before discarding it. Returning to the overview preserves the draft for the current session.

The worker's exact instruction is shown throughout. Confirmation is required to advance. Changing the instruction revokes confirmation and requires another review. English is the only supported demo language. Patient-facing content is escaped and displayed as plain text.

This is communication support. It does not diagnose, prescribe, triage, recommend treatment, or generate a care plan. The example is fictional and is not medical guidance. The prototype has not been clinically validated.

## Privacy and current limits

Use synthetic information only. A visit contains a random temporary ID, original instruction, selected language, revision, review status, and timestamps. It does not collect patient identity or clinical records. Unsaved drafts stay in browser memory and clear on reload or close. Only choosing **Save on this device** writes a confirmed card to IndexedDB in this browser. Saved cards contain the exact approved text, language, revision, and timestamps; they survive finishing a visit and reload. They are not encrypted and anyone using this browser can read them. Delete them from Saved cards when finished. Browser storage can be evicted or cleared and has no cloud backup. No visit content is sent to a backend or analytics; optional AI uses an on-device model; there is no sensitive content logging. The local static server has no request logging and serves only public application assets.

Translated explanations, patient audio playback, card export/printing, and AR are not implemented. Optional local AI wording is available in the fourth checkpoint. Worker dictation is supported only when a browser confirms on-device English recognition; unsupported devices keep typing available. The UI labels future capabilities as future work. Finishing without saving clears the draft. Saving keeps a copy on this device; it does not print or send it. Local language selection and language-pack validation remain future decisions.

## Structure

- `src/visit.js`: visit data and approval rules; independent of the interface.
- `src/app.js`: interface, navigation, input handling, and session state.
- `src/cards.js`: validates approved card snapshots before storing or displaying.
- `src/storage.js`: IndexedDB access; save and delete succeed only after transaction commit.
- `src/speech.js`: local-only English dictation, capability and pack checks, permission/error handling, and microphone lifecycle.
- `src/offline.js`: service-worker setup and installation/offline readiness indicators.
- `sw.js`: versions and caches public app assets; never caches care-card content.
- `manifest.webmanifest` and `icons/`: PWA metadata and install icons.
- `src/styles.css`: responsive visual system and accessibility states.
- `scripts/serve.mjs`: dependency-free local static server.
- `tests/visit.test.mjs`, `tests/cards.test.mjs`, and `tests/speech.test.mjs`: approval, revision, storage failure, local-only speech admission, transcript handling, cancellation, and error tests. Speech tests use a fake browser recognition engine; they do not record a real microphone.

The same static files can later be deployed to a public static host for the submission URL. This checkpoint is local only. Transformation output is stored separately from the original instruction with its own review state. Future voice and language-pack adapters should connect to the domain layer rather than bypassing approval checks.

## Verification before a checkpoint

Run syntax checks and domain tests. Walk through the sample flow on desktop and a phone-sized viewport. Check missing confirmation, missing language, editing an approved instruction, cancellation, returning to the overview, and reload clearing. Confirm that no control implies voice, translation, offline operation, export, or AR already works.

## Git checkpoints

First checkpoint: `Visit Bridge foundation and core handoff flow`.

Keep later voice, local storage/offline, language, AI, and demo-polish phases in separate commits. A GitHub repository and remote must be configured before this local checkpoint can be pushed. No remote is assumed here.

## Second checkpoint: offline shell and saved cards

1. Open the app online once. Wait for **Offline access ready**. This means all required public app assets are cached.
2. Prepare a confirmed English demo card and choose **Save on this device**. Success appears after the database transaction commits.
3. Finish, reload, then open **Saved cards** to retrieve it. Editing the active visit requires fresh approval and a new save before the saved copy is replaced. Saved-card views identify their original review and save timestamps.
4. Disconnect the network and reload. The cached app shell and saved cards remain available in the same browser at the same origin. You can also create and save new text-only cards while offline.
5. Delete a card through its confirmation dialog. Deletion is permanent within this prototype. An unsuccessful deletion leaves it listed.

Compatible browsers can install via **Install Visit Bridge** when a native prompt is available, or their browser menu / Add to Home Screen. Installation UI varies by browser; the Codex in-app browser may not offer installation. The PWA uses 192px and 512px PNG icons. Production hosting requires HTTPS; localhost is accepted for development.

A device being reported online is only a browser connection hint, not proof of internet reachability. Offline readiness is checked against cached app assets separately. The first load requires connectivity. Changing the host, port, browser, or device uses separate storage. Offline support currently covers the app shell and saved text; AI has a separate explicit installation requirement; voice depends on a supported browser and its speech pack.

App assets use a versioned cache. For each release that changes cached assets, bump the cache name in `sw.js`. New workers wait until existing Visit Bridge tabs close, preserving a running visit. The UI indicates waiting updates; close all app tabs and reopen to apply them. Saved cards remain in IndexedDB when app caches are replaced.

Second checkpoint: `Offline app shell and saved care cards`.

## Third checkpoint: on-device worker dictation

Capture now offers **Type instruction** and **Dictate instruction**. Dictation is English (`en-US`), while patient card language remains the separately selected English demo language. The browser must expose `SpeechRecognition.processLocally` and `SpeechRecognition.available`, and confirm availability for local dictation. Recognition is set to `processLocally = true` before every start. No prefixed, remote, or server recognition fallback is used. A downloadable language pack is installed only after the worker chooses its download action; it is managed by the browser, separately from the app-shell cache.

Live microphone access starts only after **Start dictation**. A single dictation session lasts at most 60 seconds. Interim words appear in a clearly labeled preview. Final recognized words append to existing text without duplicating repeated result events. The instruction is read-only while recording; stop to correct it. **Discard dictated words** restores the pre-dictation text until manual editing occurs. Recognition errors preserve the last accepted text, and oversized results are rejected without silently cutting instructions short. No raw audio is saved by Visit Bridge.

Stop, Escape, switching to typing, leaving capture, opening the cancel dialog, hiding the page, and page exit end or abort microphone use. Cancelled sessions ignore late results. Dictated edits use the same revision and worker approval rules as typed edits; they never auto-advance or auto-save. Permission denials are not automatically retried.

On-device speech APIs remain experimental and availability varies by browser, operating system, hardware, and language pack. Use a browser that exposes the local APIs on HTTPS or localhost. If local English dictation is unavailable, the app explains this and disables microphone start. Offline app readiness does not mean a local speech pack is installed.

Verification: 16 domain/controller tests and syntax checks pass; Codex browser walkthrough confirms unavailable-local-speech fallback, editable typing, required worker confirmation, and care-card preparation. Live audio recognition and actual language-pack download were not verified on this machine, because Codex's browser reports local English dictation unavailable. A real supported-browser microphone test remains necessary before presenting live dictation to judges.

Third checkpoint: `On-device voice capture for worker instructions`.

Browser API references: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally and https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static

## Fourth checkpoint: on-device AI wording and separate patient approval

Handoff now retains the worker-approved original and offers an optional **SmolLM2-135M** draft. **Install local AI** explicitly downloads approximately 207 MB (quantized model, tokenizer and WASM runtime). A progress message and Cancel control are available. Completed files are reused after an interrupted installation, but the pack is available only after every required file and the completion marker are cached. Model weights are verified with their pinned SHA-256 before caching. Browser storage eviction can require reinstallation. This pack is separate from the app shell; opening the app does not automatically download it.

The model is [`onnx-community/SmolLM2-135M-Instruct-ONNX`](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX), pinned to revision `b8a5c0f183b78c55955a5364f610c36668b5e681`, q4 weights (180,581,125 bytes). The weights and original model are Apache-2.0 licensed. Transformers.js 3.8.1 and its matching ONNX Runtime Web WASM assets are served locally from `vendor/`; versions, hashes and licenses are included there. There is no npm install step. The large model is a user-initiated browser download and is not committed to GitHub.

Inference runs in a module worker on the CPU through WASM, with one thread. It uses a read-only custom cache, `local_files_only: true`, and remote model loading disabled. After installation, generating a draft requires no model-service connection. Patient instructions are sent only to the local worker, never in asset URLs or network request bodies. Installation contacts Hugging Face for public pinned model files. There is no cloud inference fallback. Cancel, navigation, source/final edits and page hiding stop pending inference; old results cannot be applied to another source revision or language. The model has a two-minute execution limit. Failure preserves the worker's original wording and manual editing.

Rejected output is shown with its reason and has no selection button; final wording remains unchanged. A suggestion is shown separately and marked **not approved**. It does not fill the final wording automatically. **Use this draft for review** selects it; **Use original** restores the source; the worker can edit the final wording. The worker must separately confirm unchanged meaning before preparing a card, even when retaining the original. Changing the source resets the draft and both approvals; changing patient wording revokes its approval. Save eligibility includes both revisions.

Screening rejects empty/oversized outputs, changed numeric tokens, weekday/month/condition/caution tokens, unsupported control text and words outside a conservative vocabulary derived from the source and omitted source details. Few-shot completion uses the first answer line; checks apply to that line. This is a heuristic, **not clinical validation or proof of semantic equivalence**: it can miss errors and reject valid paraphrases. Human comparison remains mandatory. This is English communication support, not translation or autonomous medical advice. Some already-simple instructions may produce unchanged wording, which is valid; the app does not fabricate improvements.

Saved v2 cards include the original, final approved text, separate approval revisions/timestamps, final wording origin and generated draft/model provenance when present. Saved cards expose the original and review record in a disclosure. Existing v1 cards remain readable without rewriting their records. All saved information remains unencrypted browser storage, with the existing synthetic-data restriction.

New modules: `model-config.js` (pinned assets), `model-worker.js` (installer/inference), `model.js` (lifecycle/cancellation) and `wording.js` (conservative screening). Static hosting must serve JS/MJS with a JavaScript MIME type and WASM as `application/wasm`, allow same-origin workers and WASM compilation, and permit Hugging Face public asset downloads. The development server supplies those headers. The cache must be installed at the same origin used later offline.

Low-memory phones, performance on target devices and clinical/language validation remain unverified. A 135M model is deliberately small, but browser memory usage exceeds the compressed download size. AR, patient speech, additional languages and export remain later build phases.

Fourth-checkpoint verification: 21 domain/controller tests and syntax checks passed. In the Codex browser, a real model download and real CPU inference produced “Come back to the clinic on Tuesday.” from “Return to the clinic on Tuesday.” A missing final approval blocked card preparation; later patient edits revoked approval; saving and reopening preserved the earlier approved copy, source text and model provenance. A 390×844 viewport check found no horizontal document overflow. With the local server stopped, the app reloaded from its service worker and generated the same draft from cached model/runtime assets. The device still reported online during this server-unavailable check; complete network-disconnection and low-end physical-phone performance have not been tested.

Fourth checkpoint: `On-device AI drafting with separate patient wording approval`.
