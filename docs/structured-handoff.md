# Structured administrative handoff checkpoint

The worker selects Return visit, Already-chosen referral, or Other administrative next step. Visit Bridge organizes their existing decision; it does not choose a referral, appointment, diagnosis or treatment.

## Manual and local-model paths

The complete manual form needs no AI installation. Action is always required; return visits also require an explicit calendar date and place; referrals require a destination. Time, item and additional task can be marked required by the worker. Patient-reported information is optional, separate, and excluded from generated patient wording. It is still present in the worker's saved review record; avoid sensitive details in this demonstration.

Every populated field needs review. States distinguish confirmed, needs review, unclear, missing, not needed, and not specified. A populated value cannot be silently omitted by marking it not specified. Relative dates require an explicit worker selection, invalid calendar dates are refused, time uses 24-hour format, and a generic 'form' needs clarification. Optional unknown details can remain blank when not needed for the chosen workflow. Requirements depend on the workflow chosen by the worker; this software cannot determine whether omitted optional details are clinically necessary.

Organize my note sends only the in-memory English source to the existing local SmolLM2-135M worker. It issues seven short phrase-copy requests and constructs a fixed seven-field JSON object from their answers. Values must occur exactly in the source; unsupported answers become explicit unresolved fields, never added facts. The schema validator accepts null, an exact source string, or an exact quote/value pair and records source spans. The validator rejects unsupported schemas, invented text, absent quotations and empty proposals. Source spans carry the original revision. Relative/ambiguous dates, multiple explicit dates and weekday/date conflicts are flagged. Conservative negative/conditional/clinical-content screening routes such notes to manual clarification or original-language review. These are bounded rules, not comprehensive semantic or clinical validation.

Early real runs with a single JSON-completion prompt produced malformed/unsupported output and were rejected, motivating the bounded per-field requests. This is a small-model reliability limitation; the manual path remains complete.

AI results are separate proposals. Replacing manual fields requires an explicit replacement checkbox. Cancel, editing, workflow changes and navigation terminate active model work; older request IDs and source/field revisions cannot replace the current details. Exact quotation proves traceability only: a model can put a real phrase in the wrong field. The worker must inspect every value and the source.

## Approval and patient output

Structured confirmation and final patient wording approval are separate. Confirmed fields generate the administrative explanation; patient-reported content is excluded. English final wording must retain each confirmed field verbatim (case insensitive). This conservative presence check can reject legitimate paraphrases and does not prove semantic equivalence, absence of contradictions, or absence of new facts. Worker review is still mandatory. Correct details through Review and approve again.

Changing source or structured fields revokes the current source/field/final approvals and clears translations/model wording. Playback and AR only accept independently validated approved saved snapshots. Previous saved copies remain separate historical approvals. The existing Spanish pack accepts only the exact return action/date/clinic template; added time, item or task blocks Spanish selection rather than silently omitting details. Spanish is still an unvalidated demonstration.

Original-language review remains an explicitly labeled alternative that preserves the source and does not claim structured validation. A worker can clarify unsupported content personally. It must not be represented in the demo as passing administrative extraction.

## Persistence and offline installation

New schema v4 cards contain structured fields, optional requirement choices, source spans, worker additions, source/field/final revisions and approval timestamps. v1–v3 remain readable; they receive no invented structured review. Saved records remain plaintext until the later encrypted-vault checkpoint. Drafts remain in memory and clear on reload.

The module is included in the static server allowlist and offline shell. Updates wait until all Visit Bridge tabs for that origin close. A new test/deployed origin needs its own shell, language and model installations. The actual optional model/runtime download remains roughly 207 MB.

## Verification

50 Node checks pass, including 11 new structured workflow checks: required/optional states, dates/time/form uncertainty, source evidence, fabricated output rejection, negative/conditional/clinical screening, reported-information separation, revision revocation, saved-record corruption, Spanish omissions and late-result cancellation. Existing voice, language, card and AR controller checks remain green, including preservation of explicit approved line breaks. Return pictograms are only used when the current structured plan still fits the supported template.

Browser observations on the isolated 127.0.0.1:5174 origin (a separate cache/storage installation from 5173) demonstrated missing required details blocking approval, vague-form clarification, manual correction/approval/save, and final wording omission rejection. Real small-model runs exposed malformed JSON and source-grounded phrases in the wrong fields. Per-field chat extraction identified the explicit date but still misclassified the return action and destination. Bounded workflow/item checks flag the observed conflicts; this does not establish general fidelity. Those observations are evidence of limitations, not successful fidelity validation. A real local proposal was inspected, corrected by the worker, approved and saved with its source/model provenance. Physical-phone/network/airplane-mode results remain pending. No clinical, translation-quality or target-hardware safety validation is claimed.

Final browser checks: the exact Spanish return template rendered correctly; adding a time disabled the unsupported Spanish option. Saved provenance reopened with a model-quoted date and worker-corrected action/place/item. The structured Review screen had no horizontal overflow at a 390 × 844 viewport override (375 CSS pixels of usable page width), then the override was reset. With the 5174 preview server stopped, the cached shell reloaded and a structured saved card reopened. This is server-disconnection evidence, not a full internet-disconnection or physical-phone airplane-mode test. The preview server was restored afterward.
