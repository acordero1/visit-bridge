// Conservative screening, not a clinical or semantic guarantee. Human review is mandatory.
const facts = text => (text.toLowerCase().match(/\d+(?:[.:/]\d+)*|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\b(?:no|not|never|without|unless|before|after|until)\b/g) || []).sort().join('|');
const allowed = new Set('a an the kindly attend please you your to at in on of and is it this that for from can should will be come go back return visit clinic health worker nurse ask see bring take with again next step instruction'.split(' '));
export function draftError(original, draft) {
  if (typeof draft !== 'string' || !draft.trim() || draft.length > 1200) return 'The model did not return a usable short instruction. Keep your original wording.';
  if (facts(original) !== facts(draft)) return 'The draft changed a number, time, condition or caution. Keep your original wording.';
  const source = new Set(original.toLowerCase().match(/[a-z]+/g) || []);
  const candidate = new Set(draft.toLowerCase().match(/[a-z]+/g) || []);
  if ([...source].some(word => (!allowed.has(word) || ['clinic','nurse','worker'].includes(word)) && !candidate.has(word))) return 'The draft omitted a source detail. Keep your original wording.';
  if ((draft.toLowerCase().match(/[a-z]+/g) || []).some(word => !source.has(word) && !allowed.has(word))) return 'The draft added unfamiliar wording. Keep your original or edit the patient wording yourself.';
  if (/```|<\||\b(system|assistant|ignore|diagnosis|prescribe)\b/i.test(draft)) return 'The model returned unsupported content. Keep your original wording.';
  return '';
}
