import { isValidCard } from './cards.js';

const DATABASE = 'visit-bridge';
const STORE = 'care-cards';
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Device storage is unavailable.')); return; }
    let settled = false;
    const request = indexedDB.open(DATABASE, 1);
    const timeout = setTimeout(() => { settled = true; reject(new Error('Device storage did not respond. Close other Visit Bridge tabs and try again.')); }, 5000);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (settled) { request.result.close(); return; }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => { clearTimeout(timeout); settled = true; reject(request.error); };
  });
}

async function transact(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error || new Error('The storage operation was interrupted.'));
      tx.onerror = () => reject(tx.error || new Error('Device storage could not complete the operation.'));
    });
  } finally { db.close(); }
}

export const cardRepository = {
  async list() {
    const records = await transact('readonly', store => store.getAll());
    if (!records.every(isValidCard)) throw new Error('A saved card could not be verified.');
    return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  },
  async save(card) {
    if (!isValidCard(card)) throw new Error('The card is not approved for saving.');
    await transact('readwrite', store => store.put(card));
  },
  async remove(id) { await transact('readwrite', store => store.delete(id)); },
};
