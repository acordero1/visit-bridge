// Session policy is separate from cryptography and accepts a clock for deterministic tests.
export function createSessionController({ onLock, stopMedia, clock = globalThis, now = () => Date.now(), idleMs = 300000, hiddenMs = 60000 }) {
  let active = false, idle = null, hidden = null, deadline = 0, hiddenDeadline = 0;
  function clear() { clock.clearTimeout(idle); clock.clearTimeout(hidden); idle = hidden = null; hiddenDeadline = 0; }
  function lock(reason = 'Locked. Unsaved visit cleared.') { active = false; clear(); onLock(reason); }
  function touch() { if (!active) return; deadline = now() + idleMs; clock.clearTimeout(idle); idle = clock.setTimeout(() => lock('Locked after five minutes without activity. Unsaved visit cleared.'), idleMs); }
  function start() { active = true; clear(); touch(); }
  function visibility(isHidden) {
    if (!active) return;
    if (isHidden) { hiddenDeadline = now() + hiddenMs; stopMedia(); clock.clearTimeout(hidden); hidden = clock.setTimeout(() => lock('Locked while the app was in the background. Unsaved visit cleared.'), hiddenMs); }
    else { clock.clearTimeout(hidden); hidden = null; if ((hiddenDeadline && now() >= hiddenDeadline) || now() >= deadline) lock('Session expired. Unlock to continue.'); hiddenDeadline = 0; }
  }
  return { start, touch, lock, visibility, isActive: () => active };
}
