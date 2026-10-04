// Administrative organization only. Source evidence is traceability, never semantic proof.
export const FIELD_LABELS = { action: 'Next action', date: 'Calendar date', time: 'Time or time window', place: 'Place / destination', item: 'Item to bring', task: 'Additional administrative task', reported: 'Patient-reported information (optional)' };
export const WORKFLOWS = { return: 'Return visit', referral: 'Already-chosen referral', other: 'Other administrative next step' };
export const FIELD_STATES = ['needs-review', 'confirmed', 'unclear', 'missing', 'not-needed', 'not-specified'];
const keys = Object.keys(FIELD_LABELS);
const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function realDate(value) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function createHandoff(sourceRevision, workflow = 'other') {
  if (!Object.hasOwn(WORKFLOWS, workflow)) throw new Error('Choose a supported administrative workflow.');
  return { workflow, sourceRevision, revision: 0, approvedRevision: null, approvedAt: null, model: null,
    required: { action: true, date: workflow === 'return', place: workflow !== 'other', time: false, item: false, task: false, reported: false },
    fields: Object.fromEntries(keys.map(key => [key, { value: '', state: key === 'action' ? 'missing' : 'not-specified', origin: 'worker', evidence: null }])) };
}
export function templateHandoff(template, source, sourceRevision, place) {
  const h = createHandoff(sourceRevision, 'return');
  for (const [key, value] of Object.entries({ action: 'Return', date: template.date, place })) {
    const start = source.indexOf(value);
    h.fields[key] = { value, state: 'needs-review', origin: 'template', evidence: { quote: value, start, end: start + value.length } };
  }
  return h;
}
export function editHandoff(h, key, patch) {
  if (!keys.includes(key)) throw new Error('Unsupported handoff field.');
  const next = structuredClone(h); const field = next.fields[key];
  if (Object.hasOwn(patch, 'value')) {
    if (typeof patch.value !== 'string' || patch.value.length > 240) throw new Error('Keep each detail to 240 characters or fewer.');
    if (field.value !== patch.value) { field.value = patch.value; field.origin = 'worker'; field.evidence = null; field.state = patch.value.trim() ? 'needs-review' : 'not-specified'; }
  }
  if (Object.hasOwn(patch, 'state')) {
    if (!FIELD_STATES.includes(patch.state)) throw new Error('Choose a supported review state.');
    field.state = patch.state;
  }
  if (Object.hasOwn(patch, 'required')) {
    if (key === 'reported' || key === 'action' || (key === 'date' && h.workflow === 'return') || (key === 'place' && h.workflow !== 'other')) throw new Error('This workflow fixes that field requirement.');
    next.required[key] = Boolean(patch.required);
  }
  next.revision++; next.approvedRevision = null; next.approvedAt = null;
  return next;
}
export function changeWorkflow(h, workflow) {
  const next = createHandoff(h.sourceRevision, workflow); next.fields = structuredClone(h.fields); next.revision = h.revision + 1; next.model = h.model;
  return next;
}
export function fieldIssue(key, field, required) {
  const label = FIELD_LABELS[key];
  if (field.state === 'unclear') return `${label}: clarify this detail.`;
  if (field.state === 'needs-review') return `${label}: review the proposed value and mark it confirmed.`;
  if (required && (field.state !== 'confirmed' || !field.value.trim())) return `${label}: this workflow requires a confirmed value.`;
  if (['not-needed','not-specified','missing'].includes(field.state) && field.value.trim()) return `${label}: clear the value or confirm it; it cannot be silently omitted.`;
  if (field.state === 'confirmed' && !field.value.trim()) return `${label}: enter the confirmed detail.`;
  if (field.state === 'missing') return `${label}: resolve this missing detail or mark an optional detail not specified.`;
  if (field.state !== 'confirmed') return '';
  if (key !== 'reported' && extractionScopeIssue(field.value)) return `${label}: this wording needs the original-language review path or an administrative clarification.`;
  if (key === 'date' && !realDate(field.value)) return 'Calendar date: select an explicit real date in YYYY-MM-DD format.';
  if (key === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d(?:\s*[-–]\s*(?:[01]\d|2[0-3]):[0-5]\d)?$/.test(field.value)) return 'Time: enter an explicit 24-hour time or window, such as 09:00 or 09:00–11:00.';
  if (['action','task','place','item'].includes(key) && /\b(?:next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|today|morning|afternoon|in \d+ days?)\b/i.test(field.value)) return `${label}: clarify relative date/time wording and enter the explicit date or time separately.`;
  if (key === 'place' && /^(?:the |a |your )?(?:referral |appointment )?(?:letter|slip|card|document|form)\.?$/i.test(field.value.trim())) return 'Place / destination: this looks like an item, not a destination. Enter the intended place.';
  if (key === 'item' && /^(?:the |a |your )?form\.?$/i.test(field.value.trim())) return 'Item to bring: identify which form.';
  if (key !== 'reported' && /\b(?:maybe|might|unless|if|do not|don.t|never)\b/i.test(field.value)) return `${label}: conditional or negative wording needs clarification; use original-language review if it cannot be expressed as a chosen administrative step.`;
  return '';
}
export function handoffIssues(h, sourceRevision) {
  if (!h || h.sourceRevision !== sourceRevision) return ['Organize the current source note again.'];
  const issues = keys.map(key => fieldIssue(key, h.fields[key], h.required[key])).filter(Boolean);
  if (h.workflow === 'return' && h.fields.action.state === 'confirmed' && !/^(?:return|come back|attend|visit)\b/i.test(h.fields.action.value.trim())) issues.push('Next action: clarify the return action for this return-visit workflow.');
  return issues;
}
export function approveHandoff(h, sourceRevision) {
  const issues = handoffIssues(h, sourceRevision); if (issues.length) throw new Error(issues[0]);
  return { ...h, approvedRevision: h.revision, approvedAt: new Date().toISOString() };
}
export function handoffReady(h, sourceRevision) {
  return !h || (!handoffIssues(h, sourceRevision).length && h.approvedRevision === h.revision && Number.isFinite(Date.parse(h.approvedAt)));
}
export function handoffText(h) {
  const f = h.fields; const lines = [f.action.value.trim()];
  if (f.place.state === 'confirmed') lines.push(`Place: ${f.place.value}.`);
  if (f.date.state === 'confirmed') lines.push(`Date: ${weekdays[new Date(`${f.date.value}T12:00:00Z`).getUTCDay()]}, ${f.date.value}.`);
  if (f.time.state === 'confirmed') lines.push(`Time: ${f.time.value}.`);
  if (f.item.state === 'confirmed') lines.push(`Bring: ${f.item.value}.`);
  if (f.task.state === 'confirmed') lines.push(f.task.value);
  return lines.join('\n');
}
export function wordingIssue(h, text) {
  if (!h) return '';
  for (const key of keys.filter(key => key !== 'reported')) {
    const f = h.fields[key];
    if (f.state === 'confirmed' && !text.toLowerCase().includes(f.value.trim().toLowerCase())) return `Final wording must retain the confirmed ${FIELD_LABELS[key].toLowerCase()}: ${f.value}.`;
  }
  return '';
}
export function spanishHandoffSupported(h, template) {
  return !h || (h.workflow === 'return' && h.fields.action.value === 'Return' && h.fields.date.value === template?.date
    && h.fields.place.value === ({ clinic: 'the clinic', 'community-clinic': 'the community clinic' })[template?.location]
    && ['time','item','task'].every(key => !h.fields[key].value && ['not-needed','not-specified'].includes(h.fields[key].state)));
}
export function extractionScopeIssue(source) {
  if (/\b(?:diagnos\w*|prescrib\w*|dose|dosage|mg|medication|medicine|insulin|antibiotic|tablet|pill|treatment|emergency|urgent)\b/i.test(source)) return 'This note contains content outside administrative extraction. Use original-language review or enter a separate administrative instruction.';
  if (/\b(?:not|never|unless|maybe|might|if)\b/i.test(source)) return 'This note contains negative or conditional wording. Clarify the chosen administrative step yourself, or use original-language review.';
  return '';
}
export function parseExtraction(text, source, sourceRevision, workflow, model) {
  const scope = extractionScopeIssue(source); if (scope) throw new Error(scope);
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error('The model returned invalid structured output. Enter the details yourself.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length !== keys.length || keys.some(k => !Object.hasOwn(parsed, k))) throw new Error('The model returned unsupported fields. Enter the details yourself.');
  const h = createHandoff(sourceRevision, workflow); h.model = model;
  for (const key of keys) {
    const raw = parsed[key]; if (raw === null) continue;
    const entry = typeof raw === 'string' ? {value: raw, quote: raw} : raw;
    if (!entry || Array.isArray(entry) || Object.keys(entry).sort().join(',') !== 'quote,value' || typeof entry.value !== 'string' || !entry.value.trim() || entry.value.length > 240 || entry.value !== entry.quote) throw new Error('A model value was not an exact source quotation. Enter the details yourself.');
    const start = source.indexOf(entry.quote); if (start < 0) throw new Error('A model quotation was absent from your source. Enter the details yourself.');
    let state = 'needs-review';
    if ((key === 'date' && !realDate(entry.value)) || (key === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.value)) || (key === 'item' && /^(?:the |a |your )?form$/i.test(entry.value))) state = 'unclear';
    h.fields[key] = { value: entry.value, state, origin: 'model', evidence: { quote: entry.quote, start, end: start + entry.quote.length } };
  }
  if (!keys.some(key => h.fields[key].value)) throw new Error('The model found no usable details. Enter the details yourself.');
  if (workflow === 'return' && h.fields.action.value && !/^(?:return|come back|attend|visit)\b/i.test(h.fields.action.value.trim())) h.fields.action.state = 'unclear';
  if (/^(?:the |a |your )?(?:referral |appointment )?(?:letter|slip|card|document|form)\.?$/i.test(h.fields.place.value.trim())) h.fields.place.state = 'unclear';
  if (/\bbring\b/i.test(source) && !h.fields.item.value) h.fields.item.state = 'unclear';
  const dates = source.match(/20\d{2}-\d{2}-\d{2}/g) || [];
  if (new Set(dates).size > 1) h.fields.date.state = 'unclear';
  const weekday = source.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i)?.[0];
  if (weekday && realDate(h.fields.date.value) && weekday.toLowerCase() !== weekdays[new Date(`${h.fields.date.value}T12:00:00Z`).getUTCDay()].toLowerCase()) h.fields.date.state = 'unclear';
  return h;
}
export function validHandoff(h, source, sourceRevision) {
  if (!h || !Object.hasOwn(WORKFLOWS, h.workflow) || h.sourceRevision !== sourceRevision || !Number.isInteger(h.revision) || h.revision < 0) return false;
  if (h.model !== null && !(typeof h.model?.id === 'string' && typeof h.model?.revision === 'string')) return false;
  if (Object.keys(h.fields || {}).sort().join() !== keys.slice().sort().join() || Object.keys(h.required || {}).sort().join() !== keys.slice().sort().join()) return false;
  if (!h.required.action || (h.workflow === 'return' && !h.required.date) || (h.workflow !== 'other' && !h.required.place) || h.required.reported) return false;
  return keys.every(key => {
    const f = h.fields[key], e = f?.evidence;
    return typeof h.required[key] === 'boolean' && typeof f?.value === 'string' && f.value.length <= 240 && FIELD_STATES.includes(f.state)
      && ['worker','model','template'].includes(f.origin)
      && (f.origin === 'worker' ? e === null : e && typeof e.quote === 'string' && Number.isInteger(e.start) && e.start >= 0 && e.end === e.start + e.quote.length && e.quote === f.value && source.slice(e.start, e.end) === e.quote);
  }) && handoffReady(h, sourceRevision);
}
