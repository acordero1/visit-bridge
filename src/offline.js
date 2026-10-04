export async function initializeOffline(onState) {
  const state = { ready: false, unsupported: !('serviceWorker' in navigator), error: false, updateAvailable: false };
  if (state.unsupported) { onState(state); return; }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const checkReady = async () => {
      const active = await navigator.serviceWorker.ready;
      const worker = active.active;
      if (!worker) return;
      state.updateAvailable = !!active.waiting;
      const channel = new MessageChannel();
      channel.port1.onmessage = event => {
        if (event.data?.type === 'SHELL_STATUS') {
          state.ready = event.data.ready === true;
          onState({ ...state });
          channel.port1.close();
        }
      };
      worker.postMessage({ type: 'CHECK_SHELL' }, [channel.port2]);
    };
    const observeInstaller = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !registration.active) {
          state.error = true; onState({ ...state });
        }
        if (worker.state === 'installed' && registration.waiting && navigator.serviceWorker.controller) {
          state.updateAvailable = true; onState({ ...state });
        }
      });
    };
    registration.addEventListener('updatefound', () => observeInstaller(registration.installing));
    observeInstaller(registration.installing);
    state.updateAvailable = !!registration.waiting && !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', checkReady);
    await checkReady();
  } catch { state.error = true; onState({ ...state }); }
}
