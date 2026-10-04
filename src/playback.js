import { isValidCard } from './cards.js';

const BUSY = new Set(['starting', 'speaking', 'pausing', 'paused', 'resuming']);
const matchesLanguage = (voice, code) => String(voice.lang || '').replace('_','-').toLowerCase().split('-')[0] === code;
const localVoices = (voices, code) => voices.filter(voice => voice.localService === true && matchesLanguage(voice, code));

// Only an approved snapshot and an explicitly local voice matching the card language can reach speak().
// Availability discovery never speaks, requests a microphone, or fetches a voice.
export function createPlaybackController({ environment = globalThis, onState,
  schedule = setTimeout, unschedule = clearTimeout }) {
  const engine = environment.speechSynthesis;
  const Utterance = environment.SpeechSynthesisUtterance;
  const supported = Boolean(engine && Utterance && typeof engine.getVoices === 'function'
    && typeof engine.speak === 'function' && typeof engine.cancel === 'function');
  let state = { status: 'checking', message: 'Checking for a local voice…', available: false, voiceName: '' };
  let requestedLanguage = 'en';
  let active = null;
  let timer = null;
  let discoveryTimer = null;
  const emit = (status, message, extra = {}) => {
    state = { ...state, status, message, ...extra }; onState({ ...state });
  };
  const clearTimer = () => { if (timer !== null) unschedule(timer); timer = null; };
  const clearDiscovery = () => { if (discoveryTimer !== null) unschedule(discoveryTimer); discoveryTimer = null; };
  const voices = () => supported ? localVoices(Array.from(engine.getVoices()), requestedLanguage) : [];
  const choose = list => list.find(voice => voice.default) || list.find(voice => voice.lang.toLowerCase() === (requestedLanguage === 'es' ? 'es-es' : 'en-us')) || list[0];
  function release() {
    const hadSession = Boolean(active);
    active = null; clearTimer();
    if (hadSession) {
      try { engine.cancel(); if (engine.paused && typeof engine.resume === 'function') engine.resume(); } catch { /* Text remains available. */ }
    }
  }
  function fail(message) { release(); emit('error', message); }
  function check(code = requestedLanguage) {
    if (active) return;
    requestedLanguage = code;
    clearDiscovery();
    if (!['en','es'].includes(code)) { emit('unavailable', 'This card language has no playback support.', { available: false, voiceName: '' }); return; }
    if (!supported) { emit('unavailable', 'Read aloud is not available in this browser. You can read the card together.', { available: false, voiceName: '' }); return; }
    try {
      const voice = choose(voices());
      if (voice) emit('ready', 'Ready to read the approved words aloud.', { available: true, voiceName: voice.name });
      else {
        emit('checking', `Checking for a local ${requestedLanguage === 'es' ? 'Spanish' : 'English'} voice…`, { available: false, voiceName: '' });
        discoveryTimer = schedule(() => { discoveryTimer = null; emit('unavailable', `No local ${requestedLanguage === 'es' ? 'Spanish' : 'English'} voice is available. You can read the card together or check again after installing a device voice.`, { available: false, voiceName: '' }); }, 3000);
      }
    } catch { emit('unavailable', 'Device voices could not be checked. You can read the card together.', { available: false, voiceName: '' }); }
  }
  function arm(session, duration, message) {
    clearTimer(); timer = schedule(() => { if (active === session) fail(message); }, duration);
  }
  function play(card) {
    release(); clearDiscovery();
    if (!isValidCard(card) || !['en','es'].includes(card.language)) { emit('error', 'Open an approved care card before reading aloud.'); return; }
    requestedLanguage = card.language;
    let voice;
    try { voice = choose(voices()); } catch { /* Refuse unavailable voices. */ }
    if (!voice) { emit('unavailable', `No local ${requestedLanguage === 'es' ? 'Spanish' : 'English'} voice is available. The written card is still here.`, { available: false, voiceName: '' }); return; }
    try {
      const utterance = new Utterance(card.instruction);
      const session = { utterance, voice };
      active = session;
      utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 0.9; utterance.pitch = 1; utterance.volume = 1;
      utterance.onstart = () => {
        if (active !== session) return;
        emit('speaking', 'Reading the approved words shown on this card.');
        arm(session, 180000, 'Playback took too long and was stopped. You can read the card together.');
      };
      utterance.onend = () => { if (active !== session) return; active = null; clearTimer(); emit('ended', 'Finished reading. You can listen again.'); };
      utterance.onerror = () => { if (active === session) fail('Read aloud could not finish. The written card is still here. Try again or read it together.'); };
      utterance.onpause = () => { if (active !== session) return; clearTimer(); emit('paused', 'Reading paused. Resume or stop when you are ready.'); };
      utterance.onresume = () => { if (active !== session) return; emit('speaking', 'Reading the approved words shown on this card.'); arm(session, 180000, 'Playback took too long and was stopped.'); };
      emit('starting', 'Starting read aloud…', { available: true, voiceName: voice.name });
      arm(session, 10000, 'Read aloud did not start. Tap Read aloud to try again, or read the card together.');
      if (engine.paused && typeof engine.resume === 'function') engine.resume();
      engine.speak(utterance);
    } catch { fail('This device could not start read aloud. The written card is still here.'); }
  }
  function pause() {
    if (!active || state.status !== 'speaking' || typeof engine.pause !== 'function') return;
    const session = active;
    emit('pausing', 'Pausing read aloud…'); arm(session, 3000, 'Pause did not respond, so playback was stopped. You can listen again.');
    try { engine.pause(); } catch { fail('Playback was stopped because pausing is unavailable.'); }
  }
  function resume() {
    if (!active || state.status !== 'paused' || typeof engine.resume !== 'function') return;
    try {
      if (!voices().some(voice => voice.voiceURI === active.voice.voiceURI && voice.lang === active.voice.lang)) { fail('The local voice is no longer available. The written card is still here.'); return; }
      const session = active;
      emit('resuming', 'Resuming read aloud…'); arm(session, 3000, 'Resume did not respond, so playback was stopped. You can listen again.'); engine.resume();
    } catch { fail('Playback was stopped because resuming is unavailable.'); }
  }
  function stop() { release(); clearDiscovery(); emit(state.available ? 'ready' : 'unavailable', state.available ? 'Ready to read the approved words aloud.' : 'Read aloud is unavailable until a matching local voice is found.'); }
  const changed = () => {
    if (!active) { check(); return; }
    try { if (!voices().some(voice => voice.voiceURI === active.voice.voiceURI && voice.lang === active.voice.lang)) fail('The local voice is no longer available. The written card is still here.'); }
    catch { fail('The local voice became unavailable. Playback was stopped.'); }
  };
  if (supported && typeof engine.addEventListener === 'function') engine.addEventListener('voiceschanged', changed);
  return { check, play, pause, resume, stop, isBusy: () => Boolean(active) && BUSY.has(state.status),
    canPause: supported && typeof engine.pause === 'function' && typeof engine.resume === 'function',
    destroy() { release(); clearDiscovery(); engine?.removeEventListener?.('voiceschanged', changed); } };
}
