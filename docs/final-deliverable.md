# Visit Bridge — final deliverable

## Submission fields

Project name: Visit Bridge
Challenge: 04a — World Bank: Small AI for development (Track A: Health)
Live project URL: https://visit-bridge.megaenderdragon01.chatgpt.site
GitHub repository: https://github.com/acordero1/visit-bridge
Judge guide: https://visit-bridge.megaenderdragon01.chatgpt.site/demo.html

## Short description

Visit Bridge helps community health workers turn a next step they have already chosen into an approved care handoff that patients can take with them. It combines structured review, optional on-device AI wording, a constrained Spanish return-visit demonstration, encrypted offline saved cards, printable patient copies, local audio and marker-based camera AR replay. It works around the devices people already have, with a typed core and clear capability fallbacks.

## Problem and approach

An instruction can be lost between a brief visit and the patient's next action. Connectivity constraints make repeated cloud access unreliable. Visit Bridge preserves the worker's source, highlights uncertain administrative fields, requires explicit final approval and carries those exact approved words into a portable card. Understanding observations remain worker-recorded rather than an automated patient score. The small optional local model supports wording; it does not select medical care.

## Three-minute demo script

0:00–0:20 — “A health worker explains the next step, but the patient needs that instruction after the visit and when connectivity disappears. Visit Bridge carries the worker-approved plan forward on the device already in use.” Show the app overview and name World Bank Health Challenge 4a.

0:20–1:05 — Start a fictional visit, use the sample, show original/structured review and final wording approval. Explain that the worker owns the decision. If the local model is already installed, show a supported wording draft; do not spend the video downloading it. Typed review remains available.

1:05–1:35 — Show the approved card, understanding observation and explicit device save. Open the portable patient copy and QR. Explain that paper works without a patient phone and saved cards are encrypted locally.

1:35–2:10 — Show approved-step replay and explicit matching local audio. Show marker camera AR only if it actually works on the recording device. Otherwise show the real capability/fallback screen and label physical tracking unverified; do not present a static mock-up as hardware evidence.

2:10–2:35 — Demonstrate cached reopening while its server is stopped, or true airplane mode only if performed. Name the precise method. Show the constrained Spanish template and its unvalidated notice.

2:35–3:00 — Explain the optional roughly 207 MB model pack, separate shell/model/language availability and the remaining device/language validation. Close with the public URL and repository. “Our prototype supports communication of a worker-approved decision. We have not established improved clinical outcomes or validated patient comprehension.”

The challenge brief described a 2–5 minute video; the platform screenshot showed per-section upload constraints. Follow the actual form's current requirements. This script is not a recorded video.

## Verified scope and honest limits

91 automated tests pass. Desktop browser evidence includes real model download/inference, encrypted saved-card reopening, pack export/import and inference with the receiving app server stopped, actual QR codec checks, step replay and speech lifecycle observations. Server outage is not true phone airplane-mode evidence. Physical iPhone camera tracking, speaker pronunciation, airplane mode, paper printing, qualified Spanish review and participant comprehension remain pending. No quantified adoption, time-saving, health-outcome or AR comprehension claim is invented. The prototype has no cloud patient-record backend or health-system synchronization.

Spanish is a constrained unvalidated demonstration, not evidence of localization to a chosen community. The optional local model is approximately 207 MB installed download, and RAM/low-end device performance remains unmeasured. Runtime/model/QR licenses and provenance ship with the repository.

## Final actions that require the team

- Record and upload the required real demonstration video.
- Supply the team's actual photo.
- Complete the platform submission and its linked Google Form, as requested in the supplied submission screen.
- Confirm the current deadline/upload constraints in those forms.
- Use the public app URL and repository above. No platform or Google Form submission is claimed by preparing this package.

## Reproduce the release

Node 20+, no dependency installation. `npm start` opens the local app; `npm run build` creates the allowlisted static deployment. `npm run check` and `npm test` perform verification. Each browser/device/origin needs its own cache, model/language installation and local vault. The patient-copy marker resolves only on the saving device's vault. Service-worker updates apply after existing app tabs close.
