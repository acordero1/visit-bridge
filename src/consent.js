export const PURPOSES = ['dictation', 'storage'];
export const DECISIONS = ['not-recorded', 'granted', 'declined'];
export const createConsent = () => Object.fromEntries(PURPOSES.map(p => [p, { decision: 'not-recorded', basis: 'fictional-demo-worker-attestation', markedAt: null }]));
export function validConsent(consent) {
  return Boolean(consent) && Object.keys(consent).sort().join(',') === 'dictation,storage' && PURPOSES.every(p => {
    const entry = consent[p];
    return entry && Object.keys(entry).sort().join(',') === 'basis,decision,markedAt' && DECISIONS.includes(entry.decision)
      && entry.basis === 'fictional-demo-worker-attestation'
      && (entry.decision === 'not-recorded' ? entry.markedAt === null : typeof entry.markedAt === 'string' && Number.isFinite(Date.parse(entry.markedAt)));
  });
}
export const permitted = (visit, purpose) => validConsent(visit?.consent) && visit.consent[purpose]?.decision === 'granted';
export function setPermission(visit, purpose, decision) {
  if (!PURPOSES.includes(purpose) || !DECISIONS.includes(decision)) throw new Error('Choose a supported permission decision.');
  const consent = structuredClone(visit.consent || createConsent());
  consent[purpose] = { decision, basis: 'fictional-demo-worker-attestation', markedAt: decision === 'not-recorded' ? null : new Date().toISOString() };
  return { ...visit, consent };
}
