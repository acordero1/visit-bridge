# Marker scan and approved AR replay

This checkpoint implements the original scan-to-replay flow while retaining surface-placement WebXR AR. Only worker-approved communication is replayed; no diagnoses, treatment choices or generated clinical imagery are added.

## Patient artifact and local lookup

Saving an approved card creates a random 128-bit reference, printed as a QR marker and a readable `VB1:` reference on the approved patient copy. The QR contains no instruction, patient identifier, vault key, URL or network destination. Its mapping remains inside the encrypted saved card. It works only with the unlocked vault on the device/browser origin that saved that card; scanning on another phone cannot transfer or retrieve its contents. The paper wording remains usable without a patient phone.

Changing approved wording, language or approval revision rotates the reference. Understanding-observation updates preserve the reference when the approved snapshot is unchanged. Existing saved cards with explicit saving permission can acquire a marker on portable preview; legacy cards lacking that permission are not silently upgraded. Unknown, stale, foreign or ambiguous references fail clearly without choosing another card.

The worker explicitly starts the camera or enters the printed reference. Local QR decoding checks camera frames without recording, storing or uploading them. The scanner stops before showing the matching approved card. The worker compares its words with the paper and explicitly opens replay; camera, microphone and audio do not start automatically. Before opening, the match is checked against the current saved revision again.

## Two AR modes and exact-word replay

Camera marker replay uses the QR's four image corners to project a supplementary instruction plane over the camera image. It follows the expected marker only, hides on marker loss or a different marker, and retains complete readable approved text below. This is marker-relative camera augmentation, not persistent world anchoring, depth sensing, SLAM or body analysis. Oversized wording remains complete in the normal replay panel rather than being clipped in the projected plane.

Surface-placement AR remains available where immersive WebXR, hit testing and DOM overlay are supported. It retains placement, rotation, resizing and repositioning. iPhone Safari is the user's chosen test target; exact iPhone model and iOS version remain to be recorded. Do not assume that Safari exposes immersive WebXR on that device. Camera marker mode and the regular card provide separate paths.

Structured cards replay their approved non-empty patient lines in order, with action symbols, Previous/Next and Full card controls. Legacy/free-form cards remain one complete block. Read aloud uses only a browser-reported local voice matching the approved language and speaks the selected exact words. No AI rewriting or translation occurs in replay. Spanish retains its unvalidated demonstration notice. Tracking loss, step change, exit, lock, lifecycle cancellation and saved-card changes cancel sensitive media as appropriate; late permission/frame events cannot reopen closed sessions.

## Offline and implementation

QR encoder and decoder ship locally with the app shell, independently of the optional roughly 207 MB model pack. The two adapted JavaScript sources total 313,729 bytes. Their versions, archive integrity, local hashes and adaptations are recorded in vendor/qr-PROVENANCE.json; MIT and Apache-2.0 licenses ship alongside them. No CDN, remote QR service or model inference is required to scan/replay a saved card. Camera processing samples bounded frames up to 640 pixels on the longest side approximately four times per second.

Modules: marker-data binds references to approvals; markers generates and decodes QR and resolves valid local cards; scanner manages camera lifecycle; scan-view provides confirmation; replay selects approved steps; marker-ar projects the supplementary camera plane. Existing AR and playback controllers accept approved step indexes. Cross-tab card changes close stale replay/portable views.

## Verification and limits

89 automated tests pass, with syntax and whitespace checks. Tests exercise actual QR pixels at multiple sizes and rotation, unknown/stale/duplicate references, approval-token rotation/reuse, exact-step speech, camera denial and late permission cleanup, continuous corner decoding, projective geometry, wrong/lost marker handling and overflow fallback. Synthetic camera/XR/controller tests establish software behavior, not physical hardware performance.

Disposable-origin browser checks verified native encrypted saves, real QR codec round-trip, unknown-reference refusal, explicit matching-card confirmation, English step navigation, Spanish wording/notice preservation, reported local speech lifecycle, lock and plain fallback. Final shell v39 reopened and resolved a saved Spanish reference into the final camera-mode/replay interface with the application server stopped. The browser still reported online: this is a server-outage check, not airplane-mode evidence. A 390-by-844 viewport had no horizontal overflow in replay and portable preview. An actual downloaded fictional Spanish patient HTML includes the marker and exact wording without scripts or private review records.

Physical camera/printed-marker alignment, tracking under motion/light, iPhone Safari behavior, speaker output/pronunciation, actual airplane mode, printing, human comprehension and qualified Spanish review remain pending. No AR comprehension benefit is claimed. The next verification phase must compare the same approved task with the plain card.

A phone needs a reachable HTTPS Visit Bridge origin before camera checks; laptop localhost is not the phone's localhost. A public HTTPS deployment may therefore precede physical-device testing. The new origin needs its own app cache and fictional saved card/reference. Record the actual phone model, iOS version and Safari behavior before claiming device validation.
