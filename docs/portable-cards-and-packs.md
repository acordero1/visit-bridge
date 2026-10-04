# Portable patient cards and verified model packs

This checkpoint closes the paper/download and model side-loading software gaps in the retained Visit Bridge schematic. Marker recognition and AR action/audio replay remain the next checkpoint; existing spatial AR is retained.

## Approved patient copy

Prepared and saved approved cards offer **Print or download patient card**. A preview shows the exact approved language, action lines, date/place already present in the instruction, worker confirmation, preparation date and demonstration notice. It does not introduce a new appointment or append unapproved fields. English and the limited Spanish return-visit template are supported; Spanish remains explicitly unvalidated.

The worker must acknowledge that paper/download copies leave the encrypted vault before either action is enabled. The app rechecks the current approved snapshot and unlocked session before each action. It exports a strict whitelist, omitting the source note, model drafts, patient-reported information, permission/understanding records, card identifiers and vault material. User-supplied instruction text is escaped; the worker must still keep identities out of the instruction itself.

Printing uses the browser dialog and a patient-only print stage. Other app contents and controls are hidden by print CSS. Cancelling the dialog never reports that a copy was printed. Download creates a standalone UTF-8 `.html` file with large text and no scripts, external fonts, images or network resources; it can be opened offline or printed by another browser. Printing/PDF availability depends on the browser and printer. Long content can span pages. Symbols supplement words and are not evidence of patient comprehension.

Lock, navigation and cancellation remove the in-app preview/print stage, stop media and revoke outstanding object URLs. A file already downloaded, a PDF created by the browser, or paper cannot be recalled by locking or deleting the saved card. External-copy retention is the worker's responsibility; this is a fictional-data demonstration, not a validated clinical export workflow.

## Public AI pack

Home provides explicit connected installation, **Export installed model pack**, **Import offline model pack**, cancellation and progress. No automatic model download occurs. The receiving device needs the Visit Bridge shell cached at its own origin before disconnecting; the archive does not install the application itself.

The `.vbmodel` archive contains only 14 pinned public files: SmolLM2-135M-Instruct q4 ONNX weights and configuration/tokenizer files, the bundled Transformers/ONNX runtime and license/provenance records. Model revision is `b8a5c0f183b78c55955a5364f610c36668b5e681`. The verified archive is **206,665,468 bytes**, roughly 207 MB; weights alone are 180,581,125 bytes. It is not a tiny mobile download. No visit, audio, card, key or passphrase enters the pack worker. Model and runtime licenses/provenance are included; a pack is not a transfer of browser/OS dictation or voice resources. Spanish text content is installed separately.

The bounded manifest must match the release exactly. Unknown paths, duplicate/extra entries, wrong revisions and truncated/appended archives are rejected. Each file's length and SHA-256 are checked incrementally in a worker. A new installation is written into a separate staging cache; only after every file succeeds is the active-cache selector changed. Failure/cancellation leaves the prior selection intact. Matching verified installations are reused, while imported bytes are still checked. Web Locks serialize transfers across tabs where available. Without that API, concurrent valid installs may both complete; the last complete selection wins and old complete caches remain usable.

Previous working packs are retained for running tabs. Replacement therefore can require another roughly 207 MB, plus the archive, Blob/disk overhead and inference memory. Normal failed staging is removed. A browser/worker crash can leave unused staging files, and browser storage can be evicted. No automatic cache-compaction/recovery tool is claimed. Do not clear all site storage to reclaim space without understanding that it also erases the device vault. Browser quota and low-memory behavior still require actual-device validation. SHA-256 checks prove agreement with this trusted release manifest; they do not make a compromised app or browser trustworthy.

### Transfer steps

1. On a connected device, unlock the app and explicitly install the model. Export the installed pack after verification.
2. Transfer the public `.vbmodel` file using USB or an available local file method; Visit Bridge does not transport it to another device.
3. On the receiving device, first cache the app while connected. After disconnecting, unlock and choose **Import offline model pack**.
4. Wait for verified completion, check device readiness, and run a draft. Installation does not establish acceptable performance or wording accuracy.
5. Install the separate patient-language content and OS speech resources when needed. Typing and the manual review path remain available without AI.

## Verification

All **76 automated tests** pass, with syntax and original-schematic audit checks. New tests cover approved-only export, escaped hostile text, exact Spanish/date/place and long content, approval revocation stamps, SHA-256 boundary/chunk cases, strict archive validation, streamed length/hash/cancellation checks, rollback of corrupt staging and suppression of late exported results after cancellation.

Native browser checks used disposable encrypted vaults and fictional cards on separate localhost origins. One connected sender installed the real pack and exported it. An independent byte-by-byte audit verified all 14 archive hashes, declared sizes and exact end-of-file. The receiver cached its shell before its app server was stopped; it then imported the actual downloaded archive. The imported model loaded from the local cache and completed note extraction with the server still stopped. The observed proposal retained an unresolved relative date and included a poorly categorized place phrase, reinforcing the existing worker-review requirement; this is not a fidelity benchmark. An invalid archive was refused without losing installed availability or the two saved cards.

The saved Spanish card's acknowledged download was inspected and retained exact clinic/date/validation wording without scripts or private review records. Printing opened the native dialog; the user cancelled it and after-print cleanup correctly reported only that the dialog closed. No physical printed sheet or saved PDF was verified. Session locking cleared the preview and, separately, the model proposal and unsaved visit. Screenshots and a synthetic downloaded HTML example are available in local outputs.

These are desktop application-server-outage checks, not actual airplane mode, target-phone performance, physical USB transfer, printer output, qualified Spanish review or clinical usability evidence. Those original requirements remain tracked in the feature audit. The final shell is version 32; existing open tabs must close and reopen to activate it without discarding a current draft unexpectedly.
