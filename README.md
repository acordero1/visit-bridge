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

## First checkpoint: foundation

The responsive application includes overview, capture, worker review, language selection, patient preview, and a prepared care card. Try the built-in sample, confirm it, select English, and prepare the card. Finish clears the visit; cancellation asks before discarding it. Returning to the overview preserves the draft for the current session.

The worker's exact instruction is shown throughout. Confirmation is required to advance. Changing the instruction revokes confirmation and requires another review. English is the only supported demo language. Patient-facing content is escaped and displayed as plain text.

This is communication support. It does not diagnose, prescribe, triage, recommend treatment, or generate a care plan. The example is fictional and is not medical guidance. The prototype has not been clinically validated.

## Privacy and current limits

Use synthetic information only. A visit contains a random temporary ID, original instruction, selected language, revision, review status, and timestamps. It does not collect patient identity or clinical records. Content stays in browser memory: reloading or closing the tab clears it. No content is sent to a backend, analytics, or a model; there is no browser storage or sensitive content logging. The local static server has no request logging and serves only public application assets.

Voice, translated explanations, local AI, offline persistence, installable PWA behavior, card export/printing, and AR are not implemented. The UI labels future capabilities as future work. The care card is only displayed on the current device; finishing does not save or send it. Local language selection and language-pack validation remain future decisions.

## Structure

- `src/visit.js`: visit data and approval rules; independent of the interface.
- `src/app.js`: interface, navigation, input handling, and session state.
- `src/styles.css`: responsive visual system and accessibility states.
- `scripts/serve.mjs`: dependency-free local static server.
- `tests/visit.test.mjs`: approval, revision, text preservation, and language boundary tests.

The same static files can later be deployed to a public static host for the submission URL. This checkpoint is local only. Future transformation output should be stored separately from the original instruction with its own review state. Future persistence, voice, and language-pack adapters should connect to the domain layer rather than bypassing approval checks.

## Verification before a checkpoint

Run syntax checks and domain tests. Walk through the sample flow on desktop and a phone-sized viewport. Check missing confirmation, missing language, editing an approved instruction, cancellation, returning to the overview, and reload clearing. Confirm that no control implies voice, translation, offline operation, export, or AR already works.

## Git checkpoints

First checkpoint: `Visit Bridge foundation and core handoff flow`.

Keep later voice, local storage/offline, language, AI, and demo-polish phases in separate commits. A GitHub repository and remote must be configured before this local checkpoint can be pushed. No remote is assumed here.
