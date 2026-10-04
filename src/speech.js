import { MAX_INSTRUCTION_LENGTH } from './visit.js';

const OPTIONS = { langs: ['en-US'], processLocally: true, quality: 'dictation' };
const BUSY = new Set(['starting', 'listening', 'stopping']);
const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was blocked. Type your instruction or check your browser permissions before checking again.',
  'service-not-allowed': 'This browser blocked local speech recognition. You can type your instruction.',
  'audio-capture': 'The microphone could not be accessed. Check your device or type instead.',
  'no-speech': 'No speech was detected. Your existing instruction is still here.',
  'network': 'Local dictation failed. No online recognition fallback was started. Type your instruction.',
  'language-not-supported': 'The local English speech pack is unavailable. Check again or type instead.',
  'language-unavailable': 'The local English speech pack is unavailable. Check again or type instead.',
};

// Browser recognition is admitted only when it exposes and confirms local processing.
// No audio blobs, transcript logging, or remote-recognition path are created here.
export function createSpeechController({ environment = globalThis, onState, onText,
  schedule = setTimeout, unschedule = clearTimeout }) {
  const Recognition = environment.SpeechRecognition;
  let state = { status: 'idle', message: 'Checking on-device English dictation…', interim: '', canDiscard: false };
  let active = null;
  let undoText = null;
  let generation = 0;
  let timer = null;
  const emit = (status, message, extra = {}) => {
    state = { ...state, status, message, ...extra };
    onState({ ...state });
  };
  const clearTimer = () => { if (timer !== null) unschedule(timer); timer = null; };
  const finishSession = session => {
    if (active !== session) return false;
    active = null; clearTimer(); return true;
  };
  const localRecognizer = () => {
    if (!Recognition || typeof Recognition.available !== 'function') return null;
    const instance = new Recognition();
    if (!('processLocally' in instance)) return null;
    instance.processLocally = true;
    if (instance.processLocally !== true) return null;
    return instance;
  };

  async function check() {
    if (BUSY.has(state.status) || state.status === 'downloading') return;
    const current = ++generation;
    emit('checking', 'Checking on-device English dictation…');
    try {
      if (environment.isSecureContext !== true || !localRecognizer()) {
        emit('unsupported', 'On-device dictation is unavailable in this browser. Type your instruction; speech will not be sent to an online service.');
        return;
      }
      const availability = await Recognition.available(OPTIONS);
      if (current !== generation) return;
      if (availability === 'available') emit('ready', 'On-device English dictation is ready. Your browser will ask for microphone access when you start.');
      else if (availability === 'downloadable' && typeof Recognition.install === 'function') {
        emit('downloadable', 'Download the English speech pack once while online to enable on-device dictation. No audio is recorded during setup.');
      } else if (availability === 'downloading') emit('waiting', 'Your browser is downloading the English speech pack. Type now or check again after it finishes.');
      else emit('unsupported', 'Local English dictation is not available on this device. Type your instruction.');
    } catch { if (current === generation) emit('error', 'Local dictation could not be checked. Type your instruction or check again.'); }
  }

  async function install() {
    if (state.status !== 'downloadable' || typeof Recognition?.install !== 'function') return;
    if (environment.navigator?.onLine === false) { emit('downloadable', 'Connect to the internet to download the English speech pack. Typing works offline.'); return; }
    const current = ++generation;
    emit('downloading', 'Downloading the English speech pack. You can keep typing; no microphone is active.');
    try {
      const installed = await Recognition.install(OPTIONS);
      if (current !== generation) return;
      if (installed) { emit('idle', 'Checking the downloaded pack…'); await check(); }
      else emit('error', 'The speech pack could not be downloaded. Type your instruction or check again when connected.');
    } catch { if (current === generation) emit('error', 'The speech pack could not be downloaded. Type your instruction or check again when connected.'); }
  }

  function start(text) {
    if (!['ready', 'review'].includes(state.status) || active) return;
    if (text.length >= MAX_INSTRUCTION_LENGTH) { emit('error', 'The instruction is at the character limit. Shorten it before dictating.'); return; }
    let recognition;
    try { recognition = localRecognizer(); } catch { /* Fail closed. */ }
    if (!recognition) { emit('unsupported', 'On-device dictation is unavailable. Type instead.'); return; }
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const session = { recognition, base: text, finals: '', started: false };
    active = session; undoText = text;
    emit('starting', 'Waiting for microphone permission. Recording begins only if access is granted.', { interim: '', canDiscard: false });
    timer = schedule(() => {
      if (!finishSession(session)) return;
      recognition.abort();
      emit('error', 'Dictation timed out. Captured words are kept; check them or continue typing.', { interim: '' });
    }, 60000);
    recognition.onstart = () => {
      if (active !== session) { recognition.abort(); return; }
      session.started = true;
      emit('listening', 'Microphone active · Speak your chosen instruction in English.', { interim: '' });
    };
    recognition.onresult = event => {
      if (active !== session) return;
      const finals = [], interim = [];
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index];
        (result.isFinal ? finals : interim).push(result[0].transcript);
      }
      const finalText = finals.join(' ').trim();
      const prefix = session.base + (session.base && !/\s$/.test(session.base) && finalText ? '\n' : '');
      if ((prefix + finalText).length > MAX_INSTRUCTION_LENGTH) {
        finishSession(session); recognition.abort();
        emit('error', 'This dictation exceeds the character limit. The last accepted text was kept. Shorten it and dictate again.', { interim: '' });
        return;
      }
      if (finalText !== session.finals) {
        session.finals = finalText;
        if (finalText) { onText(prefix + finalText); state.canDiscard = true; }
      }
      emit(state.status, state.message, { interim: interim.join(' ').trim(), canDiscard: state.canDiscard });
    };
    recognition.onerror = event => {
      if (!finishSession(session)) return;
      recognition.abort();
      emit(event.error === 'not-allowed' ? 'blocked' : 'error', ERROR_MESSAGES[event.error] || 'Dictation stopped unexpectedly. Captured words are kept; check them or type instead.', { interim: '' });
    };
    recognition.onend = () => {
      if (!finishSession(session)) return;
      emit(session.finals ? 'review' : 'ready', session.finals ? 'Words captured. Check the text and correct it before reviewing the instruction.' : 'No words captured. Try again or type your instruction.', { interim: '' });
    };
    try { recognition.start(); }
    catch {
      if (finishSession(session)) emit('error', 'Local dictation could not start. Type your instruction or check again.', { interim: '' });
    }
  }

  function stop() {
    if (!active || state.status === 'stopping') return;
    if (!active.started) { cancel(); return; }
    emit('stopping', 'Stopping the microphone and finishing the captured words…');
    try { active.recognition.stop(); } catch { cancel(); }
  }
  function cancel() {
    generation++;
    if (active) {
      const recognition = active.recognition;
      active = null; clearTimer();
      try { recognition.abort(); } catch { /* Recognition is already closed. */ }
      emit('ready', 'Microphone stopped. Accepted words are kept; you can edit them.', { interim: '' });
    }
    if (['checking', 'downloading'].includes(state.status)) emit('idle', 'Check on-device dictation when you return.', { interim: '' });
  }
  function discard() {
    const original = undoText;
    cancel();
    if (original !== null && state.canDiscard) onText(original);
    undoText = null;
    emit('ready', 'Dictated words discarded. Your text from before dictation is restored.', { interim: '', canDiscard: false });
  }
  function textEdited() { undoText = null; state.canDiscard = false; onState({ ...state }); }
  function clear() { cancel(); undoText = null; emit('idle', 'Check dictation availability after unlocking.', { interim: '', canDiscard: false }); }
  return { check, install, start, stop, cancel, clear, discard, textEdited,
    isBusy: () => BUSY.has(state.status), getState: () => ({ ...state }) };
}
