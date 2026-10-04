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

Use synthetic information only. A visit contains a random temporary ID, original instruction, selected language, revision, review status, and timestamps. It does not collect patient identity or clinical records. Unsaved drafts stay in browser memory and clear on reload or close. Only choosing **Save on this device** writes a confirmed card to IndexedDB in this browser. Saved cards contain the exact approved text, language, revision, and timestamps; they survive finishing a visit and reload. They are not encrypted and anyone using this browser can read them. Delete them from Saved cards when finished. Browser storage can be evicted or cleared and has no cloud backup. No content is sent to a backend, analytics, or a model; there is no sensitive content logging. The local static server has no request logging and serves only public application assets.

Voice, translated explanations, local AI, card export/printing, and AR are not implemented. The UI labels future capabilities as future work. Finishing without saving clears the draft. Saving keeps a copy on this device; it does not print or send it. Local language selection and language-pack validation remain future decisions.

## Structure

- `src/visit.js`: visit data and approval rules; independent of the interface.
- `src/app.js`: interface, navigation, input handling, and session state.
- `src/cards.js`: validates approved card snapshots before storing or displaying.
- `src/storage.js`: IndexedDB access; save and delete succeed only after transaction commit.
- `src/offline.js`: service-worker setup and installation/offline readiness indicators.
- `sw.js`: versions and caches public app assets; never caches care-card content.
- `manifest.webmanifest` and `icons/`: PWA metadata and install icons.
- `src/styles.css`: responsive visual system and accessibility states.
- `scripts/serve.mjs`: dependency-free local static server.
- `tests/visit.test.mjs` and `tests/cards.test.mjs`: approval, revision, exact text, storage-failure propagation, and stored-card validity tests.

The same static files can later be deployed to a public static host for the submission URL. This checkpoint is local only. Future transformation output should be stored separately from the original instruction with its own review state. Future voice and language-pack adapters should connect to the domain layer rather than bypassing approval checks.

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

A device being reported online is only a browser connection hint, not proof of internet reachability. Offline readiness is checked against cached app assets separately. The first load requires connectivity. Changing the host, port, browser, or device uses separate storage. Offline support currently covers the app shell and saved text; it does not imply offline voice or AI.

App assets use a versioned cache. For each release that changes cached assets, bump the cache name in `sw.js`. New workers wait until existing Visit Bridge tabs close, preserving a running visit. The UI indicates waiting updates; close all app tabs and reopen to apply them. Saved cards remain in IndexedDB when app caches are replaced.

Second checkpoint: `Offline app shell and saved care cards`.
