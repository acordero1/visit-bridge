// A worker observation about an exact approved snapshot, never an automated score.
export const UNDERSTANDING_RESULTS = ['understood', 'clarified', 'needs-follow-up'];
export function approvedContentStamp(record) {
  return JSON.stringify([record.revision, record.patientTextRevision, record.language,
    record.translation?.pack.version || '', record.handoff?.revision ?? null,
    record.confirmedAt, record.patientApprovedAt,
    record.patientText ?? record.instruction]);
}
export function validUnderstanding(value, record) {
  return value === null || (Boolean(value) && Object.keys(value).sort().join(',') === 'approvedStamp,markedAt,result'
    && UNDERSTANDING_RESULTS.includes(value.result)
    && typeof value.markedAt === 'string' && Number.isFinite(Date.parse(value.markedAt))
    && value.approvedStamp === approvedContentStamp(record));
}
export function currentUnderstanding(record) {
  return record?.understanding && validUnderstanding(record.understanding, record) ? record.understanding : null;
}
export function saveStamp(visit) {
  return JSON.stringify([approvedContentStamp(visit), currentUnderstanding(visit)]);
}
// Preserve the exact approved text, including order. Symbols are only assigned to known fields.
export function patientLines(card) {
  const known = new Map(); const h = card.handoff;
  if (h) {
    const f = h.fields;
    known.set(f.action.value.trim(), 'action');
    if (f.place.state === 'confirmed') known.set(`Place: ${f.place.value}.`, 'place');
    if (f.time.state === 'confirmed') known.set(`Time: ${f.time.value}.`, 'time');
    if (f.item.state === 'confirmed') known.set(`Bring: ${f.item.value}.`, 'item');
    if (f.task.state === 'confirmed') known.set(f.task.value, 'task');
  }
  return card.instruction.split('\n').map(text => ({ text,
    symbol: known.get(text) || (h?.fields.date.state === 'confirmed' && text.startsWith('Date: ') && text.includes(h.fields.date.value) ? 'date' : card.template && card.instruction === text ? 'action' : 'note') }));
}
