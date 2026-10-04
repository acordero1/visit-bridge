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

Card export/printing remains planned. Spanish supports a constrained return-visit demonstration, marked unvalidated. Spatial AR is implemented for compatible WebXR devices; real-device placement remains unverified. Patient read aloud is available where the browser exposes a local voice matching the card language. Optional local AI wording is available in the fourth checkpoint. Worker dictation is supported only when a browser confirms on-device English recognition; unsupported devices keep typing available. The UI labels future capabilities as future work. Finishing without saving clears the draft. Saving keeps a copy on this device; it does not print or send it. Professional and community translation validation remains outstanding.

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

Low-memory phones, performance on target devices and clinical/language validation remain unverified. A 135M model is deliberately small, but browser memory usage exceeds the compressed download size. AR, additional languages and export remain later build phases. Patient read aloud is added in the fifth checkpoint.

Fourth-checkpoint verification: 21 domain/controller tests and syntax checks passed. In the Codex browser, a real model download and real CPU inference produced “Come back to the clinic on Tuesday.” from “Return to the clinic on Tuesday.” A missing final approval blocked card preparation; later patient edits revoked approval; saving and reopening preserved the earlier approved copy, source text and model provenance. A 390×844 viewport check found no horizontal document overflow. With the local server stopped, the app reloaded from its service worker and generated the same draft from cached model/runtime assets. The device still reported online during this server-unavailable check; complete network-disconnection and low-end physical-phone performance have not been tested.

Fourth checkpoint: `On-device AI drafting with separate patient wording approval`.

## Fifth checkpoint: read approved cards aloud

The prepared card and both legacy/current saved cards now offer **Read aloud**. Voice discovery never starts audio. An explicit tap creates a speech utterance containing the exact approved patient text from that card. The saved copy's text is used even when an active visit has later edits. The playback controller independently validates approval before handing text to the speech engine. Unapproved originals, AI suggestions and rejected model output have no playback path.

This uses browser/OS speech synthesis, with an explicitly selected English voice whose `localService` property is exactly `true`. Remote voices, unspecified locality and other languages are refused. This follows the browser's [localService contract](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService); it depends on the browser and OS reporting the voice correctly. There is no speech service request, automatic voice download, cloud fallback or microphone request in Visit Bridge. No audio or playback history is stored. Installed device voices are separate from the app's service-worker cache and AI pack. A compatible local voice is needed for playback without connectivity; the written card always remains available.

The interface includes startup, reading, paused, finished, unavailable and failure messages. It offers Pause/Resume when both engine methods exist, Stop during active playback, and Read again after completion. Delayed voice lists are handled by `voiceschanged` plus a bounded discovery wait; a late voice becoming available only enables the control. Check voice again retries discovery without speaking. The voice name is shown for the selected local voice. Device volume controls determine loudness.

Navigation, switching cards, editing through the handoff screen, opening a deletion dialog, hiding the page and page exit stop playback. Escape also stops it. Stale end/error/start events from a stopped utterance cannot change a new session. Stopping a paused session resets the paused engine before another reading. A missing start, stalled playback or failed Pause/Resume stops the session and keeps the written card available. Errors never switch to another voice automatically.

`src/playback.js` handles voice admission, validated snapshots, playback lifecycle and timeouts. `src/app.js` integrates the controls into each approved card. `tests/playback.test.mjs` uses a synthetic engine to check final-text selection, refusal of remote/missing-language voices, approval gating, legacy cards, stop/stale events, pause/resume, delayed availability, loss of a local voice and startup failure. Physical speakers, pronunciation and browser/OS pause/resume behavior need validation on the intended demo phone.

Fifth checkpoint: `Local read-aloud playback for approved care cards`.

Fifth-checkpoint verification: all 28 tests and the changed-file syntax checks passed. The preview browser exposed local English voice Samantha and reported actual speech start, completion, pause and resume on a prepared sample card. With the local server stopped, the cached app reloaded and reported speech start on the saved v2 model-approved card; the legacy v1 card also offered playback and an explicit Stop returned it to ready. No browser errors were reported during the prepared-card playback check. These are browser-event observations, not an assessment of speaker output or pronunciation. Full network disconnection and a physical target phone remain untested.

## Sixth checkpoint: offline Spanish return-visit demonstration

Capture offers **Use a return-visit template**. The worker selects an explicit calendar date (2000–2099) and either the clinic or community clinic, then reviews the rendered English source. Handoff asks for the patient's language preference. Spanish becomes available only for this structured template after explicit installation of the approximately 3 KB, version 1.0.0 pack. Free-text instructions remain English. No model is used for translation, and the English model controls are hidden for Spanish.

The pack contains a fixed return-action sentence, seven weekday names, two clinic phrases and Spanish patient-card/playback labels. Both versions preserve the same ISO calendar date and location slot; weekdays derive from the date in UTC to avoid timezone drift. Invalid calendar dates and unsupported places are rejected. The Spanish wording is read-only. Editing date or clinic through Capture clears both approvals, translation and language selection. A separate final checkbox requires a worker able to read Spanish to compare action, date and clinic before approving the exact demonstration text. Switching language revokes final approval.

**This is an unvalidated demonstration, not a professionally reviewed translation.** `reviewStatus` is `demonstration-unvalidated`; professional and community review fields are null. The patient card visibly states this in Spanish, including saved copies. Use fictional information only. Clinical review, qualified translation review and local comprehension testing remain outstanding. This build implements the language-pack mechanism and restricted demo; it does not claim that the planned validated-language milestone has been achieved.

`src/templates.js` validates slots and renders exact phrases. `src/language-packs.js` verifies pinned SHA-256 bytes before putting the optional JSON in a separate CacheStorage cache. The pack is not automatically downloaded with the shell. Cached loading also verifies integrity and needs no network. Corrupt, absent or unsupported packs leave English available. Saved v3 cards retain the source, template, pack snapshot/version, demonstration status and approval revisions/timestamps. Saved text can be reopened independently of the pack cache. Legacy v1/v2 English records stay readable. Stored Spanish snapshots are checked against the supported fixed sentence, weekdays and places, so altered instructions or pack phrases are refused.

Spanish playback selects only a matching `es` device voice reporting `localService === true`; English and remote voices cannot receive Spanish card text. Patient playback labels and statuses are Spanish. A missing compatible voice disables speech while preserving the written card. Device voices are independent of the optional language pack. Static deployment must serve the pack JSON and the two new JS modules at their current paths.

Verification: all 33 tests and module syntax checks pass. Browser testing verified explicit pack installation, date/place preservation, refusal to prepare without final approval, saved v3 reopening with the source/pack audit, and Spanish speech start/completion with the reported local Eddy (Spanish (Spain)) voice. With the app server stopped, the cached shell reopened the saved Spanish card, reported Spanish speech start/completion and generated a new return-visit template from the installed pack for another date. The browser still reported online: this is a server-unavailable test, not a complete network-disconnection test. Speaker output, pronunciation, target-phone performance and professional/community validation remain unverified.

Sixth checkpoint: `Offline Spanish return-visit language pack and approval`.


## Seventh checkpoint: spatial AR care card

Prepared and saved approved cards offer **View card in AR** (Spanish: **Ver tarjeta en RA**). Opening this view checks capability without requesting camera access. It shows the exact approved snapshot and explains local camera use. On a compatible device, **Start AR** requests a WebXR immersive AR session with surface hit testing and a DOM overlay for controls. Denied permissions, unsupported devices, unavailable graphics and session errors retain the regular readable card. Discovery does not open a camera, and no generic camera-only simulation is presented as spatial AR.

`src/ar.js` owns the session lifecycle and revalidates approval independently. It copies the approved card before starting, so later changes cannot alter the AR content. Hit testing finds a surface in a local reference space. A translucent card previews the current candidate; **Place card** or a scene tap fixes its location. Its initial orientation faces the viewer. **Reposition**, **Larger**, **Smaller** and **Rotate** adjust placement and size. Width is bounded between 0.3 and 1 metre. Tracking loss hides the rendering until tracking returns. Placement lasts for this session only and is not saved as a persistent spatial anchor. Scene placement is suppressed for taps on the overlay's controls.

`src/ar-renderer.js` draws the approved text onto a local canvas texture and renders an upright WebGL plane at the chosen world location for each XR view. It bundles all graphics code with the app; it fetches no AR libraries, models or imagery. Calendar and clinic pictograms are included only for structured return-visit cards and infer no medical advice. English and Spanish content is preserved; Spanish demonstration status remains visible in both the launch preview and rendered texture. Text wraps without cutting words or silently discarding characters. Instructions that cannot fit the supported texture are refused with the regular card available.

**Back to card**, Escape, navigation, page hiding, page exit and session termination stop the session and release hit-test/graphics resources. An unresolved permission request that completes after cancellation immediately ends its late session. The modal keeps background controls inert and restores focus on close. Existing speech and inference are stopped when the AR view opens. Visit Bridge neither records, saves nor uploads camera frames. The browser/OS controls the session's permissions and tracking.

The service worker caches both AR modules with the shell, independently of AI/language packs. AR still needs a browser/device supporting `immersive-ar`, hit testing and DOM overlays, plus a secure context. Production hosting must use HTTPS and permit same-origin `xr-spatial-tracking`; the local server supplies the permissions header. Installed app assets and the approved saved card need no application-server connection. The device's own offline AR runtime behavior must be checked on the intended phone.

Verification: all 39 tests and syntax checks pass. Synthetic XR tests cover approved-snapshot admission, discovery without access requests, placement, resizing/rotation, repositioning, tracking loss, permission rejection, late-session cancellation and disposal. The real preview browser reports AR unsupported; browser checks verified readable English/Spanish fallback, the persistent Spanish unvalidated notice, return to the normal card, and no horizontal overflow at 390×844. With the app server stopped, the cached app reopened an English saved card and its AR capability/fallback screen. Complete network disconnection, real camera permissions, GPU rendering and physical surface tracking on an AR phone are not yet verified. This checkpoint implements spatial AR but does not claim that an actual phone placement demonstration has passed.

API references: [WebXR session requests](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession), [hit-test sources](https://developer.mozilla.org/en-US/docs/Web/API/XRSession/requestHitTestSource), and [Google's WebXR AR setup](https://developers.google.com/ar/develop/webxr/hello-webxr).

Seventh checkpoint: `Spatial AR display for approved care cards`.


## Eighth checkpoint: original-schematic coverage audit

The complete accepted schematic and original 13-part timeline have been recovered from this chat and archived in `docs/original-schematic.md` and `docs/original-timeline.md`. The user's subsequent instructions retain every feature, including AR; historic stretch/cut wording does not authorize dropping features. The seven software checkpoints differ from those original timeline parts.

`docs/feature-audit.json` maps 45 requirement groups to original schematic sections and timeline parts, implementation evidence, current status, remaining work, acceptance criteria and dependencies. `docs/remaining-build-plan.md` orders the remaining work. `docs/feature-audit.md` is the generated human-readable report. Status counts are not a completion percentage: requirements have different sizes and external validation needs.

Run `npm run audit:features` to check unique IDs, evidence-file/anchor existence, coverage links for all 21 schematic sections and 13 timeline parts, and dependency validity/cycles. Run `npm run audit:report` to regenerate the tracked report and local user-facing copies under `outputs/`. With the bundled runtime, use its full Node path with `scripts/report-audit.mjs --write`. This is source traceability checking, not app execution, clinical validation or proof of hardware behavior.

The audit identifies missing understanding checks, full structured extraction/uncertainty, encrypted storage/app lock, portable paper/model packs, marker-based AR replay, measured baseline/user evidence, hosting and final submission assets. Current surface-placement AR is retained as an additional mode and does not satisfy the original marker-scan/audio sequence by itself. Spanish remains unvalidated; qualification/community review cannot be manufactured by code. Optional authorized health-system synchronization is preserved as a future capability requiring a real authorized destination.

Next coding checkpoint: structured administrative handoff fields, constrained source-backed extraction and explicit uncertainty, while preserving original/final approval controls. No patient-facing feature was added by the audit checkpoint. Review statuses before claiming the full schematic is complete.
