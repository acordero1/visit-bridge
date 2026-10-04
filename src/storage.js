import { isValidCard } from './cards.js';
import { permitted } from './consent.js';
import { createVaultKeys, unlockVaultKey, rewrapVaultKey, encryptCard, decryptCard } from './vault-crypto.js';
const LEGACY = 'care-cards', ENCRYPTED = 'encrypted-cards', SETTINGS = 'vault-settings';
const signature = config => config ? `${config.vaultId}:${config.wrapRevision}:${config.wrappedKey}` : null;

export function createDeviceStore(indexedDB = globalThis.indexedDB) {
  const transactions = new Set();
  async function open() {
    if (!indexedDB) throw new Error('Device storage is unavailable.');
    return new Promise((resolve, reject) => {
      let expired = false;
      const request = indexedDB.open('visit-bridge', 2);
      const timer = setTimeout(() => { expired = true; reject(new Error('Close other Visit Bridge tabs and try again. Device storage did not respond.')); }, 5000);
      request.onupgradeneeded = () => { for (const name of [LEGACY, ENCRYPTED, SETTINGS]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' }); };
      request.onerror = () => { clearTimeout(timer); reject(request.error); };
      request.onsuccess = () => { clearTimeout(timer); if (expired) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
  }
  async function transaction(mode, operation) {
    const db = await open();
    try { return await new Promise((resolve, reject) => {
      const tx = db.transaction([LEGACY, ENCRYPTED, SETTINGS], mode); transactions.add(tx);
      let result, problem;
      tx.oncomplete = () => { transactions.delete(tx); resolve(result); };
      tx.onabort = tx.onerror = () => { transactions.delete(tx); reject(problem || tx.error || new Error('Storage operation interrupted.')); };
      try { operation(tx, value => { result = value; }, reason => { problem = reason; tx.abort(); }); } catch (reason) { problem = reason; tx.abort(); }
    }); } finally { db.close(); }
  }
  return {
    abortAll() { for (const tx of transactions) { try { tx.abort(); } catch { /* Already completed. */ } } },
    read() { return transaction('readonly', (tx, done) => {
      const result = {}, requests = [[SETTINGS,'config', 'config'],[LEGACY,null,'legacy'],[ENCRYPTED,null,'encrypted']]; let remaining = requests.length;
      for (const [store,id,key] of requests) { const request = id ? tx.objectStore(store).get(id) : tx.objectStore(store).getAll(); request.onsuccess = () => { result[key] = request.result ?? null; if (!--remaining) done(result); }; }
    }); },
    commit(expected, changes, allowed = () => true) { return transaction('readwrite', (tx, done, fail) => {
      const request = tx.objectStore(SETTINGS).get('config');
      request.onsuccess = () => {
        if (!allowed() || signature(request.result) !== expected) { fail(new Error('Vault changed or locked. Unlock again before continuing.')); return; }
        if (changes.erase) for (const name of [LEGACY, ENCRYPTED, SETTINGS]) tx.objectStore(name).clear();
        if (changes.config) tx.objectStore(SETTINGS).put(changes.config);
        for (const card of changes.put || []) tx.objectStore(ENCRYPTED).put(card);
        for (const id of changes.remove || []) tx.objectStore(ENCRYPTED).delete(id);
        if (changes.clearLegacy) tx.objectStore(LEGACY).clear();
        done(true);
      };
    }); }
  };
}
export function createVaultRepository(store = createDeviceStore()) {
  let key = null, config = null, epoch = 0;
  const check = token => { if (token !== epoch) throw new Error('Vault operation cancelled because the session locked.'); };
  const verify = cards => { if (!cards.every(isValidCard)) throw new Error('A saved card could not be verified. Originals have not been erased.'); return cards; };
  function lock() { epoch++; key = null; config = null; store.abortAll(); }
  async function inspect() { const state = await store.read(); return { configured: Boolean(state.config), legacy: Boolean(state.legacy.length) }; }
  async function setup(passphrase) {
    const token = epoch, state = await store.read(); check(token);
    if (state.config || state.encrypted.length) throw new Error('A vault already exists or needs repair. Nothing has been changed.');
    verify(state.legacy);
    const created = await createVaultKeys(passphrase); check(token);
    const encrypted = await Promise.all(state.legacy.map(card => encryptCard(card, created.key, created.config.vaultId))); check(token);
    const copies = verify(await Promise.all(encrypted.map(card => decryptCard(card, created.key, created.config.vaultId))));
    if (JSON.stringify(copies) !== JSON.stringify(state.legacy)) throw new Error('Migration verification failed. Originals remain intact.');
    check(token);
    await store.commit(null, { config: created.config, put: encrypted, clearLegacy: true }, () => token === epoch); check(token);
    config = created.config; key = created.key;
  }
  async function unlock(passphrase) {
    const token = epoch, state = await store.read(); check(token);
    if (!state.config || state.legacy.length) throw new Error('Vault setup is incomplete or plaintext records remain. Nothing has been erased.');
    const recovered = await unlockVaultKey(state.config, passphrase); check(token);
    verify(await Promise.all(state.encrypted.map(card => decryptCard(card, recovered, state.config.vaultId)))); check(token);
    // Recheck settings after expensive derivation; another tab may have changed them.
    const latest = await store.read(); check(token);
    if (signature(latest.config) !== signature(state.config)) throw new Error('Vault changed in another tab. Try unlocking again.');
    config = state.config; key = recovered;
  }
  async function list() {
    if (!key) throw new Error('Unlock the vault first.');
    const token = epoch, active = key, current = config, state = await store.read(); check(token);
    if (state.legacy.length || signature(state.config) !== signature(current)) { lock(); throw new Error('Vault changed. Unlock again.'); }
    const cards = verify(await Promise.all(state.encrypted.map(card => decryptCard(card, active, current.vaultId)))); check(token);
    return cards.sort((a,b) => b.savedAt.localeCompare(a.savedAt));
  }
  async function save(card) {
    if (!key) throw new Error('Unlock the vault first.');
    if (!isValidCard(card) || !permitted(card, 'storage')) throw new Error('Review the card and record permission to save it.');
    const token = epoch, current = config, encrypted = await encryptCard(card, key, config.vaultId); check(token);
    await store.commit(signature(current), { put: [encrypted] }, () => token === epoch); check(token);
  }
  async function remove(id) { if (!key) throw new Error('Unlock the vault first.'); const token = epoch; await store.commit(signature(config), { remove: [id] }, () => token === epoch); check(token); }
  async function changePassphrase(oldValue,newValue) {
    if (!key) throw new Error('Unlock the vault first.');
    const token = epoch, current = config, next = await rewrapVaultKey(current,oldValue,newValue); check(token);
    await store.commit(signature(current), { config: next }, () => token === epoch); check(token); lock();
  }
  async function erase() { lock(); const token = epoch, state = await store.read(); check(token); await store.commit(signature(state.config), { erase: true }, () => token === epoch); check(token); }
  return { inspect, setup, unlock, lock, list, save, remove, changePassphrase, erase, isUnlocked: () => Boolean(key) };
}
export const cardRepository = createVaultRepository();
