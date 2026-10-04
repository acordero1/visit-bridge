# iPhone Safari, offline and localization validation

## Scope and status

The user selected an iPhone with Safari. Exact model, iOS/Safari version, local worker role and setting remain pending. This checkpoint adds HTTPS deployment preparation and an offline tester checklist; it does not establish physical phone, printer, fluent language or participant results. Previously implemented marker scanning, camera projection, spatial WebXR, approved replay, plain fallback and model packs remain in scope.

The checklist at `/device-check.html` is separate from the patient workflow. It requests no camera/microphone permissions, starts no speech and reads no vault records. It shows secure-context, browser connection hint, service-worker/cache readiness, camera API presence, immersive AR support, browser-reported local English/Spanish voices, WebAssembly/WebGPU presence and storage estimates. API presence is not execution or hardware evidence. Storage quota/usage is not process memory/RAM. Capability snapshots can be refreshed; results remain in page memory until the tester downloads a JSON report. Reloading clears entries. Do not put patient information, passphrases or identifying reviewer information in observations.

## Secure deployment

`node scripts/build-static.mjs` copies the explicit `scripts/public-assets.mjs` allowlist into generated `dist/`. It fails for missing assets or shell URLs not included in the build. Only public files are packaged; QA fixtures, docs, Git metadata, scratch work, result exports and local vaults are excluded. The output includes locally bundled model runtime and QR libraries, their licenses, Spanish demo packs and the tester checklist. Model weights remain a separate optional explicit installation/transfer.

The Sites manifest selects this static directory. Response policies ship in `_headers`, including camera/microphone permission restricted to this origin, XR permission, CSP, no-referrer and MIME sniffing protection. Header-file behavior follows [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/). The service worker remains uncacheable at the HTTP layer; it maintains its own versioned offline shell. No backend for patient records is added.

New Sites starts owner-private. The owner must sign in on the iPhone when connected to open it. Private hosting access and the local encrypted vault are separate. A public judge URL/audience decision belongs to the final hosting/submission phase; no external patient sharing is implied.

## Preparation on the actual phone

1. Record phone model, iOS and Safari version, Safari tab versus Home Screen context, origin, current release and marker medium. Test each context separately; browser storage/permissions can differ.
2. Open the HTTPS app online, complete vault setup with your own passphrase, and wait for Offline access ready. Open the checklist once online so it is cached too. Its Open Visit Bridge link uses another tab so pending checklist entries stay intact.
3. Install the Spanish pack and optional roughly 207 MB model pack while online only if those paths will be tested. Record storage availability and install duration; do not treat model installation as shell installation.
4. Create a fictional English structured handoff including action, date, clinic and an item. Review original/fields/final text, perform the understanding observation and grant saving permission. Save it on this phone. A marker from the laptop's vault will not resolve on the phone.
5. Download this phone's patient HTML and print it or show it on a second screen. Record which medium was actually used. Exact approved text, date/place and warning must remain visible and usable without a patient phone. A screen test is not a physical print test.

## Airplane-mode journey and camera/audio checks

Turn on Airplane Mode and explicitly disable Wi-Fi; verify cellular/Wi-Fi are off. A browser online hint does not prove this. Reload the app, unlock and reopen the fictional saved card. Create, review, approve, save and reopen another typed card while disconnected. Verify understanding records and saved wording. Use disposable fictional cards for deletion checks.

Explicitly start Scan care card, accept the anticipated camera prompt on this origin, scan the prepared QR and compare its approved words before opening replay. Record seconds from start to match and scan failures. The scanner must stop before confirmation. Test the printed-reference fallback and an unknown reference. Reapprove altered wording and confirm that the old marker no longer resolves.

Start camera marker replay explicitly. Verify overlay follows the expected marker, hides when it leaves view or a different marker appears, recovers on return, and preserves full readable wording below. Test gentle motion, tilt, ordinary room lighting and larger text. Record marker width/distance/light descriptively, not invented tracking accuracy. Long wording must remain complete in the regular panel.

Check Previous/Next/Full card and matching local-language speech. Listen to actual speaker output while offline; note intelligibility, omitted words, delays and pronunciation. A browser-reported local voice is only a hint. Unsupported voices retain text. Surface-placement WebXR is a separate check; record unsupported honestly if Safari does not expose it. Do not call the marker camera plane a persistent world anchor.

Exit/stop/lock, background Safari, reload and reopen. Verify camera/audio stops and vault locking follows session rules. Deny camera once and verify manual reference/plain-card fallback. Use VoiceOver and larger text for navigability/readability; note focus or clipping issues. Inspect network activity through suitable device debugging if available and record the observation method; airplane mode alone does not audit all attempted requests.

For Spanish, use only the supported exact return-date-and-clinic template. Confirm date/place and unvalidated notice across paper, plain card and replay. Record fluent or qualified review only if it actually occurred. Keep the demonstration notice without genuine validation evidence.

For optional AI, measure the same supported English task once cold and once warm with a stopwatch. Record model/runtime release, duration, success/failure, introduced facts and corrections. Browser storage estimates do not establish peak RAM; memory remains unmeasured unless a real supported tool/method is recorded. Pack transfer/import and offline inference must be tested on the receiving phone before claiming portable installation there.

## Recording and acceptance

Each checklist result starts pending. Passed, failed and unsupported require a written observation; device model/OS/browser are required before observed results export. Unsupported is a limitation, not a success. The report contains device/context, origin, timestamp, capability snapshot and manually recorded outcomes; it contains no card payload. Record source commit alongside the downloaded report. Download before reload. Share only synthetic results when returning observations to this chat.

Completion requires actual recorded device outcomes. Fix any implementation failures and rerun the affected paths. Physical phone, full offline, print, qualified language review and AR/plain-card comparison remain pending until performed. Compare the same fictional task with plain text/paper and AR, recording task time, errors/corrections and actual feedback. Do not claim measured comprehension, adherence or health outcomes from software checks or visual appeal.

## Checks completed in this checkpoint

All 91 automated tests and syntax checks pass. Static-build validation confirms every cached shell URL is included in the public allowlist. Checklist browser inspection confirmed that all outcomes begin pending and export refuses a passed result without an observation. This is a desktop tool check; all physical iPhone observations remain pending. The public build uses 58 explicitly selected files.
