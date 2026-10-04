The timeline should build the smallest complete, trustworthy handoff first, then add language, local AI, and the optional AR layer. That order gives us a working project early, lets us push meaningful checkpoints to GitHub throughout, and protects the core demo if time runs short.

One practical note from checking the workspace: it is currently empty and is **not yet a Git repository**. We should make repository setup the first build step. The submission screen you shared gives a deadline of **October 4 at 9:15 AM America/Indiana/Indianapolis**, including a 15-minute grace period. Given the time remaining, AR and other stretch features must come after the core offline handoff is complete.

# Visit Bridge build timeline

## Part 0 — Lock the project’s context and safety boundary

**Purpose:** Resolve the decisions that affect the model, wording, device, and evidence before building around assumptions.

**We will settle:**

- **Primary user:** the specific frontline worker who documents the visit. The current schematic says “frontline primary-care worker,” but the build should name the role we are representing.
- **User’s device:** the existing phone or shared clinic device the prototype will run on. We must not assume the patient owns a smartphone.
- **Target setting:** which country or health context we represent. The challenge persona is fictional and draws on several settings; we should not present it as a real clinic.
- **Target language:** choose and name one language for the prototype. Confirm that a fluent speaker can review its wording and that offline interaction is technically feasible.
- **Single handoff scenario:** choose a non-diagnostic next step, such as a worker-approved return date, referral already chosen by the worker, or document the patient should bring.
- **Project boundary:** Visit Bridge records and communicates the worker’s decision. It does not diagnose, prescribe, choose treatment, assign urgency, or generate clinical guidance.

**Why this comes first:** the health annex explicitly permits work on documentation, referral, follow-up, and continuity, while disallowing medical-image interpretation and diagnosis datasets. The AI and local-language choices depend on the target language and device. [Challenge 4a brief](/Users/acordero/Downloads/c4a.pdf)

**Done when:** we can state in one sentence who uses the app, on which device, in what language, and for what end-of-visit task.

**GitHub checkpoint 0 — Project charter.** Create the repository and add a README with the working title, problem statement, chosen scenario, target language/device assumptions, safety boundary, and links to the challenge brief and cited background sources. The workspace is currently empty, so this also establishes the first tracked version.

---

## Part 1 — Check that the offline AI and language idea is feasible

**Purpose:** Find technical blockers before investing in the full interface.

This is a short feasibility spike, not the finished feature. We will test the chosen device and target language against the specific tasks Visit Bridge needs:

- Can the device run the necessary model without a network?
- Can a worker enter a short note by voice or text?
- Can the model preserve dates, places, and next-step wording accurately enough for a worker to review?
- Can the patient-facing interaction use the selected local language?
- How large are the model files, how much memory do they use, and how long does a typical interaction take?
- Does the microphone or inference library make hidden network calls?
- What happens in background noise, code-switching, and unclear speech?

Use potential resources listed in the brief—such as Common Voice, FLEURS, MMS, FLORES-200/NLLB-200, or OPUS—as starting points only. Their presence does not establish accuracy for a particular dialect or healthcare phrase. Record the model/dataset name, version, license, size, supported language, and known limitations.

**Fallback rule:** if local speech recognition is unreliable, keep typed entry as the baseline and use only reviewed phrases or recorded language content for the patient-facing interaction. Do not imply that unsupported speech recognition works.

**Done when:** we have either a tested offline approach for the chosen device and language, or a clear fallback that preserves the challenge’s local-language requirement.

**GitHub checkpoint 1 — Feasibility notes and spike.** Push any tiny test harness and a short `docs/feasibility.md` with device, model candidate, file size, offline test result, language coverage, latency, and fallback. This checkpoint preserves the research even if we change model choices later.

---

## Part 2 — Create the app shell and project structure

**Purpose:** Establish the app, build process, and deployable foundation.

Build the basic project shell with:

- The Visit Bridge name and a short purpose statement.
- A simple home screen with **New handoff**.
- A visible online/offline indicator.
- A clear supported-device assumption.
- A basic layout that works on a phone-sized screen.
- A place in the app to show language availability and limitations.
- A minimal app manifest/cache strategy if the chosen build is web-based.
- A clear separation between application UI, local AI, validation, language content, and storage.

At this point the controls can use fake data. The purpose is to prove that the app launches, the user can move through the intended screens, and the offline strategy is technically real.

**Done when:** the app opens on the target device, the basic screens are navigable, and the offline shell can be reopened after it has been installed or cached.

**GitHub checkpoint 2 — App shell.** Push the working app shell and setup instructions. Confirm the repository contains no real patient data, API keys, or unlicensed model files.

---

## Part 3 — Define the handoff data and privacy model

**Purpose:** Agree on exactly what the app stores before adding AI or patient content.

Use a small, explicit data structure. For the selected demo scenario, it should include only fields such as:

- Patient-reported information, if needed and clearly labeled as reported.
- The worker’s chosen next step.
- Date or time, only if provided or confirmed by the worker.
- Place or destination, only if provided or confirmed.
- Any item to bring or follow-up action, if part of the scenario.
- Source note from the worker.
- AI-organized draft.
- Worker’s edits and approval status.
- Selected output language.
- Created/approved timestamps if needed for the demo.

Keep the worker’s original note separate from the AI-organized draft. The source note remains the record of what the worker said; the AI summary is only a derived draft.

**Privacy behavior to specify and implement:**

- Use synthetic records in the hackathon demo.
- Store only the minimum information required.
- Store locally and protect it from casual access.
- Ask for consent where required before recording or saving an encounter.
- Delete raw audio after the worker reviews the transcript by default.
- Provide a delete/cancel path before approval.
- Do not show sensitive text in lock-screen notifications.
- Avoid sending data to cloud services.
- State what happens if the device is shared or lost.

**Done when:** the fields, ownership, and privacy behavior are written down before AI is connected.

**GitHub checkpoint 3 — Data and privacy spec.** Push the data model and `docs/privacy.md`. Include where data resides, who can read it, what is retained, and what happens if the phone is shared or lost, as required by the health annex.

---

## Part 4 — Build the complete typed, non-AI workflow

**Purpose:** Make the product useful before adding AI. This is the fallback and the baseline against which AI value will be judged.

Build an end-to-end typed workflow:

1. Worker starts a handoff.
2. Worker enters the next step they have already decided.
3. Worker adds or confirms date/place if relevant.
4. The app displays a patient-facing version using a fixed template.
5. Worker reviews and approves.
6. Patient reads or listens to the approved explanation.
7. Worker records whether they clarified the plan or checked understanding.
8. The approved handoff is saved locally.

This version must not produce advice. The worker enters the content. The app formats it consistently.

Use this as the simple-tool comparator: if this fixed form already solves the problem with less risk and equal usability, we must be candid about that. WHO warns that digital interventions can create extra workload if they require workers to maintain parallel digital and paper systems. The prototype should therefore show how the handoff fits the current encounter rather than adding a second record-keeping task. [WHO digital-health evidence and recommendations](https://www.ncbi.nlm.nih.gov/books/NBK541898/)

**Done when:** the entire typed flow works offline using synthetic data and ends with a worker-approved explanation.

**GitHub checkpoint 4 — Baseline end-to-end app.** Push the first complete, usable version before integrating any model. This is the most important recovery point: if AI integration fails, we still have a working prototype.

---

## Part 5 — Add the target language and accessible patient explanation

**Purpose:** Meet the local-language requirement without presenting an unvalidated translation as safe.

Add one named, reviewed language to the patient-facing flow. Choose among:

- Reviewed local-language text.
- Human-recorded phrases.
- On-device text-to-speech if the voice is available and understandable.
- A limited set of templates with variable fields such as dates, after testing how dates and numbers are spoken.

The patient-facing explanation should use short sentences, one action per line, large text, replay controls, and simple icons where useful. It should not rely on color alone. The patient does not need their own phone; the worker can show or play the message before the patient leaves.

Test the exact date, number, and place wording with a fluent reviewer. If local-language voice output is not dependable, use the reviewed text/recorded-phrase fallback and say what is not yet supported.

**Done when:** the worker can produce one complete handoff and the patient can hear or read it in the named language, with the worker able to review it first.

**GitHub checkpoint 5 — Language and accessibility.** Push reviewed strings/audio assets, attribution or license details, language limitations, and tests. Do not commit sensitive recordings or personal data.

---

## Part 6 — Add on-device AI for capture and organization

**Purpose:** Add a small AI capability that has a specific, demonstrable advantage over a fixed form.

Add the selected on-device model to support only the bounded tasks required:

- Transcribe a short worker note, if the model supports the target language offline.
- Structure the worker’s wording into the fixed handoff fields.
- Flag missing or ambiguous date/action information.
- Prepare a short draft explanation from the worker-entered content.

The model must not:

- Decide the care plan.
- Add a diagnosis, medicine, dosage, urgency, warning sign, or referral.
- Fill missing information from its general knowledge.
- Finalize or deliver a plan without worker approval.

Keep the source note and the generated draft side by side. Make confidence and uncertainty visible in plain language. All model output remains an editable draft until approval.

**AI value test:** compare this flow against the typed baseline from Part 4. Measure whether voice capture and organization reduce effort or improve language access. Date sorting, template formatting, and saving are ordinary software features; they do not by themselves justify AI.

**Done when:** the feature works offline on the declared device, preserves the worker’s meaning in the tested cases, flags uncertainty, and requires worker approval.

**GitHub checkpoint 6 — Offline AI.** Push the model integration and an evaluation note covering model name/version, license, size, device, offline tests, supported language, failure cases, and the typed fallback. Never commit model credentials or patient data.

---

## Part 7 — Add human review, uncertainty, and edge-case handling

**Purpose:** Make the guardrails visible and test them intentionally.

Implement and test cases such as:

- Missing date.
- Ambiguous date (“maybe Thursday”).
- Unclear place name.
- Misheard number.
- Low-confidence transcription.
- Unsupported language.
- Note that contains clinical advice the system should not paraphrase.
- Worker rejects or edits the draft.
- Worker cancels before approval.
- App is interrupted mid-flow.

For every uncertain case, the system should ask for clarification or use a safe fallback. It should not show a polished but unsupported answer.

The human-control states should be obvious:

- **Worker input**
- **AI draft**
- **Needs review**
- **Approved by worker**

**Done when:** a reviewer can see exactly when the worker has authority, can change the output, and can stop an unsafe or inaccurate draft.

**GitHub checkpoint 7 — Guardrails.** Push tests and the visible review/uncertainty states. Include a short safety note in the README.

---

## Part 8 — Finish local storage, offline behavior, and device-loss protections

**Purpose:** Prove that “offline” is an actual product property.

Test the core journey in airplane mode:

- Launch the app.
- Start and complete a handoff.
- Run any promised model inference.
- Play the patient explanation.
- Save, reopen, edit, and delete the synthetic record.
- Restart the app and confirm its expected offline behavior.
- Confirm no hidden cloud speech, translation, or inference call is required.

Implement encrypted local storage and basic device protections appropriate to the prototype. Keep sync as an optional future capability unless an authorized destination and secure behavior are genuinely implemented. If synchronization is described as future work, label it clearly; do not imply it exists.

**Done when:** the full core task runs without connectivity, the data behavior is documented, and network inspection or equivalent checks show no hidden transmission in the offline path.

**GitHub checkpoint 8 — Offline/privacy verification.** Push the offline test checklist, known device limitations, and results.

---

## Part 9 — Validate with people and collect honest evidence

**Purpose:** Generate evidence for the submission without overstating what a short test can prove.

Use synthetic scenarios. If time and access allow:

- Run 10–20 scripted worker notes through the app, including ambiguous and noisy cases.
- Ask a fluent language reviewer to check the output.
- Ask a few people unfamiliar with the app to repeat the next step after hearing or reading it.
- Compare with the typed or paper baseline.
- Record completion time, correction rate, successful offline completion, and comprehension in the test.
- Note device, language, sample size, environment, and limitations.

Do not claim that the app reduces missed appointments, improves treatment, or is clinically safe based on this small prototype test. The evidence should support the specific statement: the prototype can capture, review, and communicate a worker-approved next step under the tested conditions.

**Done when:** we have results, limitations, and a baseline comparison that can be stated honestly in the demo and submission.

**GitHub checkpoint 9 — Evidence package.** Push test scenarios, evaluation method, aggregate results, and limitations. Do not commit participant names, identifiable recordings, or other personal data.

---

## Part 10 — Add the optional Care Card AR layer

**Purpose:** Add a memorable presentation feature only after the core handoff is stable.

The worker-approved next step can be represented on a simple printed or on-screen card with a visual marker. Scanning the card with the worker’s phone can display a short visual sequence and replay the approved local-language explanation.

Keep it deliberately limited:

- AR displays only what the worker approved.
- It does not read bodies, interpret medical images, or generate medical advice.
- The printed card and plain audio/text remain useful without AR.
- The patient does not need to own a compatible phone.
- Scanning and playback work offline.
- The team tests whether AR helps users understand or remember the next step compared with the plain card.

AR is a stretch feature, not a substitute for the working core. We should remove it if it consumes time needed for language validation, offline testing, or the required submission video.

**Done when:** the AR view works reliably offline, conveys the same approved instruction as the plain version, and does not introduce confusion in the comparison test.

**GitHub checkpoint 10 — AR, only if stable.** Push it separately so we can remove or disable it without destabilizing the core application.

---

## Part 11 — Prepare the project page, documentation, and live URL

**Purpose:** Make the work reviewable by judges and usable from the submission form.

Prepare:

- Final project name: **Visit Bridge**.
- Short description and one-sentence need.
- GitHub repository with setup/run instructions.
- Live project URL that opens a clear project/demo page.
- Technical summary: device, model size, offline behavior, language, and data handling.
- Sources list with source/year/country where applicable.
- Data/model list with name, license, size, use, and known gaps.
- Known limitations and future work.
- A clear statement that the prototype does not diagnose or recommend treatment.
- A team photo, as requested by the submission screen you shared.

The URL landing page should describe and show the project; it should not imply that the live web page alone proves local model functionality. Include instructions for installing/caching the app and testing the offline flow.

**Done when:** a judge can understand the project, open the demo, find the repository, see the offline/language limitations, and identify the source of the prototype’s content.

**GitHub checkpoint 11 — Submission candidate.** Push the release candidate, README, source citations, installation instructions, and final screenshots or demo assets that contain no sensitive information.

---

## Part 12 — Record the required video and complete both submissions

**Purpose:** Meet the formal requirements and tell one concise story.

The challenge brief requires a **2–5 minute video** and says entries without one will not make the shortlist. The submission screen you shared says to submit on the Hack-Nation platform and also complete the Google Form. It asks for the project name, chosen challenge, GitHub repository, live project URL, and team photo.

Suggested 3-minute video sequence:

- **0:00–0:20 — Problem:** Noor’s visit is brief and the next step must be understood before she leaves.
- **0:20–0:35 — Project promise:** state who uses Visit Bridge and what it helps them do.
- **0:35–1:45 — Working demo:** airplane mode on; worker captures; AI drafts and flags uncertainty; worker edits and approves; patient hears or reads the explanation; worker checks understanding.
- **1:45–2:10 — Why AI:** show the simpler baseline and explain what voice/language organization adds.
- **2:10–2:30 — Guardrails:** human approval, no diagnosis, local storage, synthetic demo data.
- **2:30–2:50 — Localization:** name the language and device, explain validation and limitations.
- **2:50–3:00 — Evidence and next step:** state actual test result and what remains to validate.

Use the required problem-statement structure:

> **Because of Visit Bridge, a frontline primary-care worker can give the patient a clear, worker-approved next step before the patient leaves, even without internet; we know this because [insert actual prototype test result] compared with [the simple baseline].**

Do not fill the evidence clause until we have measured it.

Before final submission, verify:

- Prototype or code link works.
- Video is between 2 and 5 minutes.
- The platform submission is complete.
- The Google Form is complete.
- GitHub URL is correct.
- Live project URL is correct.
- Team photo is attached.
- Selected challenge is 04a Health.
- Model/data sources and licenses are cited.
- Demo contains only synthetic patient information.
- The actual submission deadline shown in the platform is confirmed.

**GitHub checkpoint 12 — Final submission tag.** Push the final video link, final documentation, and tested release candidate, then tag the exact version shown in the submission.

# Checkpoint plan at a glance

| Checkpoint | What gets pushed |
|---|---|
| **0** | Repository, project charter, problem, scope, assumptions, sources |
| **1** | Offline/model/language feasibility notes and tiny spike |
| **2** | App shell, phone layout, offline launch |
| **3** | Data fields, provenance model, privacy behavior |
| **4** | Complete typed baseline handoff, saved locally |
| **5** | One reviewed local language and accessible patient explanation |
| **6** | On-device AI draft and evaluation notes |
| **7** | Human approval, uncertainty, correction, and refusal states |
| **8** | Offline, storage, and privacy verification |
| **9** | Prototype evidence and baseline comparison |
| **10** | Optional AR layer, only if stable |
| **11** | Submission-ready documentation and live URL |
| **12** | Final video, both submissions checked, release tag |

## Order of priority if time gets tight

The order is deliberate:

1. **Working offline baseline**
2. **Worker review and approval**
3. **One real local-language interaction**
4. **Small AI that adds measured value**
5. **Privacy and uncertainty checks**
6. **Evidence and required video**
7. **AR polish**

The biggest risk is spending too long on AR or model experimentation before we have a complete, safe handoff. The biggest scoring opportunity is demonstrating one end-to-end journey that really works under the challenge constraints and explaining, with evidence, why the AI helps beyond a simple form.

When we begin coding, we can take these parts one at a time, finish each part’s acceptance checks, and push that checkpoint before moving on.
