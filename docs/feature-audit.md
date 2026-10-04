# Visit Bridge feature audit

Assessment baseline: Git commit `9b8261a`, 2026-10-04.

The user's later instruction retains the full schematic, including AR. Archived text describing cuts/stretch priorities is historical and does not authorize dropping features. Alternative ideas (Care Card AR as a separate product, Referral Relay and Follow-up Memory) are not silently imported into Visit Bridge.

Baseline 9b8261a plus marker/replay source inspection, 89 automated tests, real QR codec/browser checks and final cached-shell reference lookup with the application server stopped; see docs/marker-replay.md. Physical iPhone Safari, camera tracking, airplane mode, printer, qualified language/security/clinical and comprehension evidence remain pending.

## Coverage summary

- **partial:** 8
- **implemented:** 20
- **needs-validation:** 8
- **missing:** 8
- **future:** 1

These are requirement counts with unequal scope, not a completion percentage. A source-section mapping is traceability, not proof of perfect semantic completeness.

The archived full schematic and timeline remain the authoritative feature reference; any newly discovered omission must be added here, not silently removed.

## Ordered remaining work

The seven implemented checkpoints are not the original 13-part timeline. The original timeline is archived, not replaced. The following checkpoints resume development by closing its specific gaps. The user's later instructions retain every schematic feature, including AR. No prior 'cut it if time gets tight' wording authorizes dropping features now.

1. **Context and device decisions, alongside development.** Record the chosen frontline role, target setting, real existing device, browser and Spanish-language relevance. Obtain fluent/professional/community review when available. The software cannot manufacture human review, clinic access, or hardware measurements. Keep each pending item visible. The user selected iPhone with Safari; record its model and iOS version before device checks. Immersive WebXR support is not assumed.
2. **Structured administrative handoff and explicit uncertainty — implementation checkpoint completed; field-model/device validation tracked separately.** Add action/date/time/place/item/task and optional separately labeled patient-reported information. Preserve the source and span provenance. Use unknown/ambiguous states; never infer a date or referral decision. Add constrained local-model extraction and validated output schemas, with a complete typed baseline. Put source, fields and model draft side by side. Keep clinical content outside supported model transformation. Changes revoke approval and future understanding results. Validate no new facts, uncertain date, missing required fields, optional blanks and rejected output. Do not collect patient concerns merely because a field exists.
3. **Patient understanding — implementation completed; human/device validation pending.** Add one approved action per line, simple action-specific symbols and a worker-facing teach-back prompt. Record understood, clarified or needs-follow-up against the exact approved revision. Let the worker replay/clarify without automatic patient scoring. Add Home pack readiness and explicit input language. Save/reopen understanding status with the card. Do not equate marking understood with proven medical comprehension.
4. **Encrypted vault and privacy — implementation checkpoint completed; security/context/device validation remains pending.** Authenticated full-payload encryption, passphrase-protected keys, explicit lock/unlock, inactivity/background/page lifecycle locking, media cancellation, independent fictional dictation/save permission, verified atomic legacy migration, passphrase change, deliberate erase and cross-tab write fencing are implemented. Legacy records remain plaintext until the user completes setup. See docs/device-vault.md for tested behavior and recovery/device-loss limits; no production-health-data safety claim.
5. **Portable patient card and installation — software checkpoint completed; physical device/transfer/print validation pending.** Implement approved-only printing/download with source date/place, language and validation notice preserved. The patient can leave with an understandable paper artifact without owning a phone. A pinned, integrity-checked import/export and connected-install path with local transfer instructions is implemented. See docs/portable-cards-and-packs.md for actual browser verification and limits. Report the actual roughly 207 MB download, not a fictitious tiny mobile footprint. Preserve content/version approval guards and do not export raw audio or identifiers.
6. **Original marker-scan AR replay — software implemented; physical device validation pending.** Printed opaque QR references resolve the approved local-vault card offline, with unknown/stale/ambiguous refusal and worker confirmation. Exact approved steps and explicit local-language audio are integrated with camera marker projection and retained surface-placement WebXR AR. See docs/marker-replay.md. Verify real printed-marker scanning/tracking, audio and replay on the iPhone; compare the same task with the plain card before claiming benefit.

7. **Full offline/device and localization verification checkpoint.** The user selected iPhone with Safari. Record model/iOS and establish reachable HTTPS hosting first if necessary for camera access; laptop localhost cannot serve as the phone URL. Once the above flows exist, run the complete create/organize/review/explain/understanding/encrypted-save/reopen/delete journey in actual airplane mode. Measure cold/warm model latency, device memory method, pack transfer size, speech behavior, pronunciation and AR tracking. Inspect network behavior. Obtain and record genuine qualified/fluent/community review; do not remove the Spanish demonstration notice without evidence. If a participant/device cannot be obtained, the requirement remains pending.
8. **Evidence and baseline checkpoint.** Run 10–20 synthetic common/uncertain scenarios; record fidelity, introduced facts, corrections/rejections, completion and time. Compare the same tasks with the plain form/paper baseline. Obtain consented comprehension/local-worker feedback where possible. Keep scripted results separate from human results; report device, language, sample, method and limits. Use no invented adherence, diagnosis, clinical-safety or health-outcome claims. Record country/year/source for problem evidence separately from model/evaluation inputs.
9. **Hosting and documentation checkpoint.** Prepare a public HTTPS origin, correct static paths/headers/MIME, pack installation and offline instructions, judge-facing scope, GitHub link and limitations. Consolidate charter/privacy/feasibility/model/license/evaluation/replication documents. A new origin needs its own installation/cache. Confirm the public site, not only localhost. Deployment and external submission occur only within the user's authorized workflow.
10. **Video and submission checkpoint.** Confirm current challenge/platform requirements and deadline directly. The original brief described a 2–5 minute video; the earlier platform screenshot also showed per-section upload constraints, so verify their current relationship before recording. Prepare the story, actual demonstration, measured baseline claim, language/device/safety/limitations, team photo and links. Complete both platform and Google Form when authorized; tag the exact submitted release.

**Preserved future capability:** optional authorized health-system synchronization remains part of the original future vision. It is disabled and cannot be enabled against an invented destination. Define the minimal schema, institutional authority, consent/security rules and real destination before implementing it. No requirement is marked complete simply because it is described as future work.

**External prerequisites tracked explicitly:** chosen context/device; fluent and qualified language reviewers; consented participants; compatible AR hardware; printer availability if claiming physical paper output; hosting/account access; team photo/video; current submission deadline. Coding progress and external validation are separate.

**Checkpoint rule:** after each authorized implementation, update the JSON statuses and evidence, regenerate the report, then commit/push the completed checkpoint. The report is a project artifact, not an extra patient-facing dashboard. Existing user instructions retain every feature; proposals to change scope must be discussed before changing the target.


## Requirement-by-requirement evidence

### Name the worker, country/context and existing demo device (context)

**Status:** partial · **Phase:** context · **Original schematic:** 1, 2, 3, 4, 6, 18, 20 · **Original timeline:** 0, 1

**Evidence:** `README.md` — `frontline`; `src/app.js` — `Health worker`

**Remaining:** Spanish and iPhone with Safari are chosen. Exact phone model/iOS, country, authorized worker role and local workflow review remain pending.

**Accept when:** Document actual role, setting, device/OS/browser and language; label fictional assumptions; obtain local workflow input.

**Dependencies:** None.

### Minimal data and source/output provenance (minimal-data)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 9, 12, 13 · **Original timeline:** 3, 4

**Evidence:** `src/visit.js` — `createVisit`; `src/cards.js` — `cardFromVisit`

**Remaining:** Maintain the synthetic-data restriction and avoid adding unnecessary identifiers.

**Accept when:** Original, derived wording, languages, versions and approval timestamps remain separate; no identity or diagnostic dataset required.

**Dependencies:** None.

### Typed fallback and selected return-visit template (typed)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 8, 9 · **Original timeline:** 2, 4

**Evidence:** `src/handoff.js` — `createHandoff`; `src/app.js` — `structuredField`; `docs/structured-handoff.md` — `Verification`

**Remaining:** Complete manual administrative fields and exact return-visit template implemented. Validate usability with the chosen worker/device.

**Accept when:** A worker can type and complete the approved return-visit journey without AI; invalid calendar dates are rejected.

**Dependencies:** None.

### Short on-device voice note and editable transcript (speech)

**Status:** needs-validation · **Phase:** device-validation · **Original schematic:** 7, 8, 9, 10, 11 · **Original timeline:** 1, 6

**Evidence:** `src/speech.js` — `processLocally`; `src/app.js` — `function voiceControls`

**Remaining:** Local English API is implemented; preview device cannot run recognition. Test mic, noise, dialect and code-switching on chosen device; supported-language coverage remains constrained.

**Accept when:** Live target-device recognition works offline or remains explicitly unavailable with typed fallback; no hidden cloud recognizer.

**Dependencies:** context

### Preserve source and show draft separately (source-separation)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 8, 9, 13 · **Original timeline:** 3, 6, 7

**Evidence:** `src/app.js` — `MODEL SUGGESTION`; `src/visit.js` — `setPatientText`

**Remaining:** Keep this behavior when adding structured extraction.

**Accept when:** Original, model suggestion and worker edits remain distinguishable; model never automatically finalizes.

**Dependencies:** None.

### Fixed fields for action/date/place/item/reported concern (structured-handoff)

**Status:** implemented · **Phase:** structured · **Original schematic:** 7, 8, 9, 11 · **Original timeline:** 3, 4, 6

**Evidence:** `src/handoff.js` — `createHandoff`; `src/app.js` — `structuredField`; `docs/structured-handoff.md` — `Verification`

**Remaining:** Supported administrative fields, provenance and revision approval are implemented. Validate the chosen real workflow/device; clinical transformation remains outside supported scope.

**Accept when:** Source-backed fields are editable; worker choices resolve ambiguity; reported information is separate from the worker decision; no invented values.

**Dependencies:** context

### AI organizes variable worker notes into fixed fields (model-extraction)

**Status:** needs-validation · **Phase:** structured · **Original schematic:** 7, 9, 11, 14 · **Original timeline:** 6

**Evidence:** `src/handoff.js` — `createHandoff`; `src/app.js` — `structuredField`; `docs/structured-handoff.md` — `Verification`

**Remaining:** Per-field local extraction, source-span/schema validation and a complete manual fallback are implemented. Real smoke runs extracted a date but misclassified action/place; bounded observed conflicts are flagged. Broad fidelity and actual target-device/network validation remain outstanding. Exact quotes do not prove correct categorization.

**Accept when:** Only information present in the source can enter a draft field; worker checks each field; unsupported output is refused.

**Dependencies:** structured-handoff

### Missing, ambiguous and low-confidence details (uncertainty)

**Status:** implemented · **Phase:** structured · **Original schematic:** 7, 8, 9, 20 · **Original timeline:** 6, 7

**Evidence:** `src/handoff.js` — `createHandoff`; `src/app.js` — `structuredField`; `docs/structured-handoff.md` — `Verification`

**Remaining:** Workflow-required fields and bounded date/time/item/conditional checks are implemented. Detection is incomplete for arbitrary natural language; human review and real-device evaluation remain required.

**Accept when:** Maybe Thursday remains uncertain; the model never chooses a date/place; worker can explicitly resolve or leave an optional field blank; required unresolved fields block finalization.

**Dependencies:** structured-handoff

### Unsupported clinical content and source-note authority (administrative-boundary)

**Status:** partial · **Phase:** structured · **Original schematic:** 2, 5, 9, 12, 13 · **Original timeline:** 0, 6, 7

**Evidence:** `src/wording.js` — `draftError`; `src/app.js` — `does not diagnose`

**Remaining:** UI declares the boundary but screening is not a general clinical-content safeguard. Restrict model transformation to supported administrative handoffs and display an original-language/human-reviewed fallback for unsupported content.

**Accept when:** Model cannot introduce treatment, diagnosis, dosage, urgency or referral decisions; unsupported content receives explicit review/fallback, with residual limitations documented.

**Dependencies:** uncertainty

### Separate worker review of original and exact patient text (approval)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 5, 7, 8, 9, 13, 20 · **Original timeline:** 4, 7

**Evidence:** `src/visit.js` — `confirmVisit`; `src/visit.js` — `confirmPatientText`; `src/visit.js` — `canShare`

**Remaining:** Retain approvals and revocation rules for all new fields, exports and replay paths.

**Accept when:** Editing source/final content invalidates corresponding approval; saved/AR/audio outputs require exact approved revisions.

**Dependencies:** None.

### Correct, reject, cancel and interrupt without stale output (cancellation)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 8, 9, 13 · **Original timeline:** 4, 7

**Evidence:** `src/model.js` — `activeId`; `src/speech.js` — `cancel`; `src/app.js` — `Discard this visit`

**Remaining:** Keep cancellation consistent with future lock/understanding flows.

**Accept when:** Workers can stop/edit/reject; stale mic/model/XR events cannot apply to another visit.

**Dependencies:** None.

### One named, reviewed patient language (language-pack)

**Status:** partial · **Phase:** language-validation · **Original schematic:** 1, 7, 9, 10, 11, 18, 20 · **Original timeline:** 0, 5

**Evidence:** `packs/es-return-visit-v1.json` — `demonstration-unvalidated`; `src/language-packs.js` — `PACK_SHA256`

**Remaining:** Spanish return-visit demo works; no qualified/community review is supplied. Obtain review and actual-context justification; preserve unvalidated status until evidence exists.

**Accept when:** A fluent reviewer verifies action/date/place; reviewer scope and provenance are recorded with consent; content is understandable in the named local setting.

**Dependencies:** context

### Explicit unsupported language/phrase fallback (language-fallback)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 9, 10, 11 · **Original timeline:** 5, 7

**Evidence:** `src/visit.js` — `Spanish supports the return-visit template only`; `src/playback.js` — `localService`

**Remaining:** Extend cautiously to future templates only after reviewed language content exists.

**Accept when:** No arbitrary Spanish translation or English/remote-voice substitution; original/typed text remains available.

**Dependencies:** None.

### Dates, numbers, dialect and speech-resource evaluation (language-quality)

**Status:** missing · **Phase:** language-validation · **Original schematic:** 10, 12, 15, 18 · **Original timeline:** 1, 5, 9

**Evidence:** No implementation evidence recorded.

**Remaining:** Evaluate exact phrases, date pronunciation, dialect, noisy speech and code-switching with consented/fluent reviewers; use licensed data only if actually used.

**Accept when:** Record sample, model/content version, language/dialect, device, errors and limits; do not cite a resource as used merely because the brief lists it.

**Dependencies:** language-pack, speech

### One action per line, large text and meaningful pictograms (patient-layout)

**Status:** implemented · **Phase:** handoff · **Original schematic:** 7, 8, 10, 15 · **Original timeline:** 4, 5

**Evidence:** `src/understanding.js` — `patientLines`; `src/app.js` — `patient-symbol`; `src/styles.css` — `.patient-line`

**Remaining:** Approved line order and administrative symbols implemented. Arbitrary worker wording retains its own line breaks; no automatic sentence reinterpretation. Physical-device readability and participant symbol interpretation remain under accessibility/comprehension.

**Accept when:** All approved actions remain readable and in order; icons supplement text/audio; no color-only meaning or inferred clinical imagery.

**Dependencies:** structured-handoff

### Approved local-language playback and replay (audio)

**Status:** needs-validation · **Phase:** device-validation · **Original schematic:** 7, 8, 9, 10, 15 · **Original timeline:** 4, 5

**Evidence:** `src/playback.js` — `createPlaybackController`; `src/app.js` — `function playbackControls`

**Remaining:** English/Spanish browser speech events passed; actual speaker output and target-phone pronunciation still need review.

**Accept when:** Exact approved text is spoken only by a matching local voice; replay/stop work offline on the intended device or text fallback is clear.

**Dependencies:** context, language-pack

### Worker checks and records patient understanding (understanding)

**Status:** implemented · **Phase:** handoff · **Original schematic:** 1, 5, 7, 8, 11, 15, 20 · **Original timeline:** 4, 9

**Evidence:** `src/visit.js` — `markUnderstanding`; `src/understanding.js` — `approvedContentStamp`; `src/app.js` — `function understandingPanel`

**Remaining:** Worker recording and approval-version behavior implemented. Actual patient comprehension and frontline-worker review remain tracked under comprehension; no automated score or patient-answer storage.

**Accept when:** Worker can explain, ask patient to repeat the next step, mark result, reclarify and save the result; changing approved content requires a fresh understanding check.

**Dependencies:** structured-handoff, approval

### Save/reopen/delete exact approved copies locally (saved)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 8, 11, 13 · **Original timeline:** 4, 8

**Evidence:** `src/storage.js` — `cardRepository`; `src/cards.js` — `isValidCard`

**Remaining:** Schema 6 adds independent purpose permissions and preserves approved understanding; schemas 1–5 migrate unchanged and reopen after unlock. Maintain encrypted transactional writes and the original approval guards.

**Accept when:** Save succeeds after transaction commit; reopening retains approval/provenance; cancellation and delete failures preserve correct state.

**Dependencies:** None.

### Encrypted local encounter storage (encryption)

**Status:** implemented · **Phase:** privacy · **Original schematic:** 11, 13, 20 · **Original timeline:** 3, 8

**Evidence:** `src/vault-crypto.js` — `AES-GCM`; `src/storage.js` — `clearLegacy`; `docs/device-vault.md` — `600,000`

**Remaining:** Implemented for fictional cards, with verified atomic migration, protected keys and ciphertext at rest. User must complete vault setup; until then legacy cards remain plaintext. Qualified security and target-device validation remain pending.

**Accept when:** Stored payload is authenticated ciphertext; wrong key fails safely; original records are migrated only with a documented recovery/commit path; do not claim full device compromise protection.

**Dependencies:** structured-handoff, understanding

### App lock, session timeout and explicit privacy control (lock)

**Status:** implemented · **Phase:** privacy · **Original schematic:** 8, 13 · **Original timeline:** 3, 8

**Evidence:** `src/session.js` — `hiddenMs = 60000`; `src/app.js` — `clearSession`

**Remaining:** Explicit, inactivity, background/page lifecycle and cross-tab locks clear sensitive application state and cancel media/late work. Physical-device timer/media behavior and stronger OS/device management remain unverified.

**Accept when:** A shared-device user sees no saved instructions before unlock; timeout ends active sessions; key lifetime/reset behavior is documented.

**Dependencies:** encryption

### Encounter recording/save notices and consent workflow (consent)

**Status:** partial · **Phase:** privacy · **Original schematic:** 6, 7, 13 · **Original timeline:** 3, 4

**Evidence:** `src/consent.js` — `fictional-demo-worker-attestation`; `src/cards.js` — `permitted(visit, 'storage')`; `src/app.js` — `Permission to dictate`

**Remaining:** Separate not-recorded/granted/declined dictation and saving controls, timestamps, admission guards and alternatives are implemented for fictional encounters. Remains partial until a real authorized context has a qualified consent procedure; code cannot establish legal or informed consent.

**Accept when:** Worker records consent/decline as required by the workflow; denial preserves typed/non-recorded alternatives; notices describe actual retention and sharing.

**Dependencies:** context

### No ambient recording or raw audio retention (raw-audio)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 6, 7, 13, 15 · **Original timeline:** 3, 6

**Evidence:** `src/speech.js` — `processLocally`; `src/app.js` — `No raw audio is saved`

**Remaining:** Continue to store no raw audio; no delete-after-review mechanism is needed when raw audio is never retained by the app.

**Accept when:** Mic requires active start; navigation/cancellation/lock stops it; no application audio blobs are persisted.

**Dependencies:** None.

### Credible shared/lost-device behavior (device-loss)

**Status:** implemented · **Phase:** privacy · **Original schematic:** 13, 17 · **Original timeline:** 3, 8

**Evidence:** `docs/device-vault.md` — `Forgotten passphrases`; `src/app.js` — `ERASE SAVED CARDS`

**Remaining:** Documented unlocked/shared-device exposure, offline guessing, no recovery/backups/remote wipe, browser eviction, logical deletion and incomplete protection against compromised devices. Production security and institutional device-management validation remain pending.

**Accept when:** Describe exactly who can decrypt and read, what a lost/shared device exposes, and recovery/erasure limitations; no claim of remote revocation without a real service.

**Dependencies:** encryption, lock

### Local inference and no automatic patient upload (no-cloud)

**Status:** needs-validation · **Phase:** device-validation · **Original schematic:** 9, 11, 12, 13, 20 · **Original timeline:** 6, 8

**Evidence:** `src/model-worker.js` — `local_files_only`; `src/model.js` — `worker.postMessage`

**Remaining:** Architecture confines content to local workers; target-device network inspection of full voice/inference/translation path is still outstanding.

**Accept when:** Record network evidence showing public pack downloads only during installation, and no patient-content transmission during the tested core flow.

**Dependencies:** context

### Offline shell/PWA and visible readiness (shell)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 7, 8, 11 · **Original timeline:** 2, 8

**Evidence:** `sw.js` — `ASSETS`; `src/offline.js` — `CHECK_SHELL`; `manifest.webmanifest` — `start_url`

**Remaining:** Check installation on the chosen phone and after hosting-origin changes.

**Accept when:** After cache/install, shell and saved cards reopen without the application server; readiness distinguishes shell from model/voice packs.

**Dependencies:** None.

### Complete essential workflow in airplane mode (full-offline)

**Status:** needs-validation · **Phase:** device-validation · **Original schematic:** 5, 11, 15, 17, 20 · **Original timeline:** 1, 8

**Evidence:** `README.md` — `server-unavailable`; `sw.js` — `CACHE_NAME`

**Remaining:** Server-stopped checks are not full airplane-mode proof; new missing core features must be included in final verification.

**Accept when:** On the declared device: launch, create, AI organize where promised, approve, explain, mark understanding, encrypted save/reopen/edit/delete, replay and AR as promised without connectivity.

**Dependencies:** understanding, encryption, language-pack, model-extraction

### Named model/runtime versions, size and licenses (model-provenance)

**Status:** implemented · **Phase:** maintain · **Original schematic:** 2, 10, 12, 17 · **Original timeline:** 1, 6, 11

**Evidence:** `src/model-config.js` — `MODEL_REVISION`; `vendor/PROVENANCE.json` — `3.8.1`; `README.md` — `207 MB`

**Remaining:** Maintain actual byte counts and clearly distinguish download size from runtime memory.

**Accept when:** Pinned model/runtime files and licenses documented; no credential or patient-data commit.

**Dependencies:** None.

### Portable model installation over constrained connections (sideload)

**Status:** implemented · **Phase:** portable · **Original schematic:** 2, 11, 17 · **Original timeline:** 1, 6

**Evidence:** `src/model-pack.js` — `importPack`; `src/model-pack-manifest.js` — `PACK_MANIFEST`; `docs/portable-cards-and-packs.md` — `Verification`

**Remaining:** Pinned public pack transfer, staged verification and local import/export implemented. Real 206,665,468-byte archive imported and ran with receiving app server stopped. Physical transfer, full disconnection, quota/low-end performance remain unverified; pack does not install shell, language content or OS voices.

**Accept when:** Previously downloaded pack can be installed on a supported device without re-fetching all assets; invalid/incomplete files are refused; no smaller-device feasibility claim without measurement.

**Dependencies:** context, model-provenance

### Device feasibility, latency and memory measurements (performance)

**Status:** missing · **Phase:** device-validation · **Original schematic:** 4, 10, 11, 15, 17 · **Original timeline:** 1, 6, 9

**Evidence:** No implementation evidence recorded.

**Remaining:** Desktop inference succeeded but target-phone memory/latency, low-end limits and weak-connection installation have no measurements.

**Accept when:** Record device/browser, cold/warm latency, transfer size, memory measurement method and failure rates; no invented benchmark.

**Dependencies:** context, model-extraction, sideload

### Printable/offline portable patient summary (paper)

**Status:** implemented · **Phase:** portable · **Original schematic:** 1, 4, 7, 14, 16, 20 · **Original timeline:** 4, 10, 11

**Evidence:** `src/portable-card.js` — `patientCopyHTML`; `src/app.js` — `function openPortable`; `docs/portable-cards-and-packs.md` — `Verification`

**Remaining:** Approved-only print/download software implemented and Spanish HTML verified during server outage. Actual paper/PDF output, target-device readability and local workflow validation remain pending. Exported copies cannot be recalled.

**Accept when:** Paper/portable output is readable, matches approved text, preserves Spanish status and works without AR or network; printing hardware availability is stated.

**Dependencies:** patient-layout, approval

### Place/resize/rotate/reposition approved card in spatial AR (ar-spatial)

**Status:** needs-validation · **Phase:** ar-validation · **Original schematic:** 16 · **Original timeline:** 10

**Evidence:** `src/ar.js` — `requestHitTestSource`; `src/ar-renderer.js` — `placementMatrix`

**Remaining:** Implemented supplementary surface AR; current preview has no immersive support, so GPU/camera/physical placement remain unverified.

**Accept when:** Actual phone finds a surface and renders approved content; denial/tracking loss/exit safely return to the regular card.

**Dependencies:** context

### Original visual-marker scan-to-replay experience (ar-marker)

**Status:** needs-validation · **Phase:** ar-replay · **Original schematic:** 16, 20 · **Original timeline:** 10

**Evidence:** `docs/marker-replay.md` — `89 automated tests`; `src/marker-ar.js` — `createMarkerAR`; `src/markers.js` — `resolveMarker`

**Remaining:** Opaque printed QR, explicit local scan/lookup/confirmation and camera-marker projection are implemented and software-tested. Actual printed-marker camera tracking and iPhone Safari/airplane-mode evidence remain pending.

**Accept when:** Scanning the worker's card on a compatible device identifies the correct approved snapshot offline; unknown/stale markers fail clearly without retrieving another patient's card.

**Dependencies:** paper, approval, context

### Approved visual sequence and local-language audio in AR (ar-replay)

**Status:** needs-validation · **Phase:** ar-replay · **Original schematic:** 16 · **Original timeline:** 10

**Evidence:** `docs/marker-replay.md` — `89 automated tests`; `src/marker-ar.js` — `createMarkerAR`; `src/replay.js` — `approvedStep`

**Remaining:** Exact approved visual steps and local-language speech are integrated with marker and surface AR; Spanish notice remains. Physical device/speaker/pronunciation and actual offline verification remain pending.

**Accept when:** Each visual step represents an approved action; exact matching local-language audio can replay/stop inside AR; unsupported voice retains text; no generated clinical imagery.

**Dependencies:** ar-marker, patient-layout, audio

### AR offline and plain-card comparison evidence (ar-evidence)

**Status:** missing · **Phase:** ar-validation · **Original schematic:** 15, 16 · **Original timeline:** 9, 10

**Evidence:** No implementation evidence recorded.

**Remaining:** Fallback loads offline but physical AR and comprehension benefits have not been tested.

**Accept when:** Record supported-device offline scan/replay result and compare with plain card; distinguish engagement from measured understanding.

**Dependencies:** ar-marker, ar-replay, ar-spatial

### 10–20 synthetic scenarios and fidelity/correction evidence (evaluation)

**Status:** missing · **Phase:** evidence · **Original schematic:** 12, 15, 17, 19 · **Original timeline:** 6, 7, 9

**Evidence:** No implementation evidence recorded.

**Remaining:** Unit/controller checks exist, but no aggregate scripted scenario evaluation or field-extraction result set.

**Accept when:** Include absent/ambiguous dates, negatives, noisy/misheard input, code-switching, unsupported language/content; record introduced facts, corrections/rejections and sample/method.

**Dependencies:** model-extraction, uncertainty

### Measured AI vs plain-form/paper baseline (baseline)

**Status:** missing · **Phase:** evidence · **Original schematic:** 2, 14, 15, 17, 19 · **Original timeline:** 4, 6, 9

**Evidence:** No implementation evidence recorded.

**Remaining:** Working typed baseline exists but no time/effort comparison substantiates AI value.

**Accept when:** Same synthetic tasks are compared fairly; report time, correction burden and successful task completion without claiming unmeasured health outcomes.

**Dependencies:** evaluation, understanding

### Consented/fluent/user understanding evaluation (comprehension)

**Status:** missing · **Phase:** evidence · **Original schematic:** 3, 10, 15, 17, 18 · **Original timeline:** 5, 9

**Evidence:** No implementation evidence recorded.

**Remaining:** No participant comprehension or local-worker workflow review results.

**Accept when:** Consented small test uses fictional scenarios; record sample/context, ability to repeat next step, limits and comparison; no participant identities/public raw recordings.

**Dependencies:** understanding, language-quality, context

### Phone/keyboard/audio inclusivity and screen-reader validation (accessibility)

**Status:** partial · **Phase:** device-validation · **Original schematic:** 4, 8, 10, 15, 17, 18 · **Original timeline:** 2, 5, 9

**Evidence:** `src/styles.css` — `@media`; `src/app.js` — `aria-live`

**Remaining:** Responsive layout and basic AR overflow checks exist; verify target-phone controls, screen reader, focus, pictogram comprehension and multi-action layout.

**Accept when:** Key flow completes with large controls and keyboard/screen-reader alternatives; color is not the only cue; patient need not own a smartphone.

**Dependencies:** patient-layout, understanding

### Context sources separated from model/evaluation data (grounding)

**Status:** partial · **Phase:** evidence · **Original schematic:** 2, 3, 4, 5, 10, 12, 17 · **Original timeline:** 0, 1, 9, 11

**Evidence:** `docs/original-schematic.md` — `Data and evidence plan`; `vendor/PROVENANCE.json` — `LICENSE.txt`

**Remaining:** Research has been recovered, but no final country/year/source evidence register or clear list of datasets actually used exists. Verify cited claims before submission.

**Accept when:** Each claim has source/year/geography/limits; distinguish supporting context from tool/evaluation inputs; never imply training on listed but unused resources.

**Dependencies:** context

### Localization/adoption/replication and institutional-fit notes (replication)

**Status:** partial · **Phase:** release · **Original schematic:** 6, 13, 14, 17, 18 · **Original timeline:** 0, 3, 11

**Evidence:** `README.md` — `Run locally`; `docs/original-schematic.md` — `localizing AI development`

**Remaining:** Add deployment adaptation requirements, local review responsibilities, existing-workflow fit and no-duplicate-paperwork evaluation.

**Accept when:** Another team can identify required language content, device, role, data policy, review process, model assets and limitations.

**Dependencies:** grounding, device-loss

### Optional authorized later health-system synchronization (sync)

**Status:** future · **Phase:** future · **Original schematic:** 7, 11, 13, 20 · **Original timeline:** 3, 8

**Evidence:** No implementation evidence recorded.

**Remaining:** Preserved as an original future capability. There is no authorized destination; do not build/send records to an invented system. Define interface and ownership boundary before implementation.

**Accept when:** No automatic upload; actual destination/security/consent/institutional authority must exist before synchronization is enabled.

**Dependencies:** device-loss, consent

### Live HTTPS URL and deployable judge-facing page (hosting)

**Status:** missing · **Phase:** release · **Original schematic:** 19, 21 · **Original timeline:** 11

**Evidence:** No implementation evidence recorded.

**Remaining:** Only localhost is running. Prepare hosting configuration and deploy with correct origin/paths, worker/WASM/JSON MIME, headers and first-install instructions.

**Accept when:** Public URL opens app; packs/install/offline readiness work at that origin; browser/device limitations and repo link are easy to find.

**Dependencies:** paper

### Charter/privacy/feasibility/evaluation and source package (documentation)

**Status:** partial · **Phase:** release · **Original schematic:** 12, 13, 17, 18, 19, 21 · **Original timeline:** 0, 1, 3, 6, 8, 9, 11

**Evidence:** `README.md` — `Seventh checkpoint`; `docs/original-timeline.md` — `docs/privacy.md`

**Remaining:** README records build history, but planned charter/privacy/feasibility/evidence documents are incomplete or absent. Consolidate honest current specs without stale promises.

**Accept when:** Judges can find scope, device/language, model/license/size, retention/key policy, actual verification, gaps, replication and sources.

**Dependencies:** evaluation, device-loss, grounding

### Required video, team photo, both submissions and release tag (submission)

**Status:** missing · **Phase:** submission · **Original schematic:** 17, 19, 21 · **Original timeline:** 12

**Evidence:** No implementation evidence recorded.

**Remaining:** Prepare the required challenge video/story and form assets; confirm current platform deadline/constraints directly before submission. Historic screenshot timing is not a current deadline check.

**Accept when:** Working repo/live links; required video and team photo; correct challenge; both platform and Google Form completed by user authorization; tag exact submitted release; no invented results.

**Dependencies:** hosting, documentation, baseline

### Home/capture pack availability and explicit input language (home-readiness)

**Status:** implemented · **Phase:** handoff · **Original schematic:** 7, 8, 10, 11 · **Original timeline:** 2, 5

**Evidence:** `src/app.js` — `function readinessPanel`; `src/app.js` — `Worker input language: English`

**Remaining:** Separate shell/model/dictation/text-pack/browser-reported local-voice statuses implemented. Actual hardware/offline voice verification remains tracked separately.

**Accept when:** Before starting, the worker can identify usable local language and input modes; shell readiness never implies every pack or voice is available.

**Dependencies:** context
