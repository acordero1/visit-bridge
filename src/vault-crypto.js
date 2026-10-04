// Versioned authenticated encryption. No application keys or passphrases are persisted in plaintext.
export const VAULT_FORMAT = 1;
export const KDF_ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const random = size => crypto.getRandomValues(new Uint8Array(size));
const encode = bytes => { let result = ''; for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(result); };
const decode = value => {
  if (typeof value !== 'string' || value.length > 200000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid encrypted vault format.');
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
};
const context = (id, type) => encoder.encode(`visit-bridge:${VAULT_FORMAT}:${type}:${id}`);
export function passphraseIssue(value) {
  return typeof value !== 'string' || value.length < 15 || value.length > 256 ? 'Use a memorable passphrase of 15–256 characters. Spaces are allowed.' : '';
}
function validConfig(config) {
  if (config?.format !== VAULT_FORMAT || config.kdf !== 'PBKDF2-SHA256' || config.iterations !== KDF_ITERATIONS
      || typeof config.vaultId !== 'string' || !config.vaultId || !Number.isInteger(config.wrapRevision) || config.wrapRevision < 0
      || decode(config.salt).length !== 16 || decode(config.iv).length !== 12 || decode(config.wrappedKey).length !== 48) throw new Error('Unsupported or damaged vault settings. Nothing has been erased.');
}
async function passwordKey(passphrase, salt) {
  const bytes = encoder.encode(passphrase);
  try {
    const base = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } finally { bytes.fill(0); }
}
async function protectRawKey(raw, passphrase, vaultId, wrapRevision) {
  const salt = random(16), iv = random(12), key = await passwordKey(passphrase, salt);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context(vaultId, `key:${wrapRevision}`), tagLength: 128 }, key, raw);
  return { id: 'config', format: VAULT_FORMAT, vaultId, wrapRevision, kdf: 'PBKDF2-SHA256', iterations: KDF_ITERATIONS,
    salt: encode(salt), iv: encode(iv), wrappedKey: encode(new Uint8Array(wrapped)) };
}
export async function createVaultKeys(passphrase) {
  const issue = passphraseIssue(passphrase); if (issue) throw new Error(issue);
  const raw = random(32);
  try {
    const config = await protectRawKey(raw, passphrase, crypto.randomUUID(), 0);
    const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { config, key };
  } finally { raw.fill(0); }
}
async function recoverRaw(config, passphrase) {
  validConfig(config);
  if (typeof passphrase !== 'string' || passphrase.length > 256) throw new Error('Invalid passphrase. Nothing has been erased.');
  const key = await passwordKey(passphrase, decode(config.salt));
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(config.iv), additionalData: context(config.vaultId, `key:${config.wrapRevision}`), tagLength: 128 }, key, decode(config.wrappedKey)));
  } catch { throw new Error('The passphrase is incorrect or the vault settings are damaged. Saved cards have not been changed.'); }
}
export async function unlockVaultKey(config, passphrase) {
  const raw = await recoverRaw(config, passphrase);
  try { return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
  finally { raw.fill(0); }
}
export async function rewrapVaultKey(config, oldPassphrase, newPassphrase) {
  const issue = passphraseIssue(newPassphrase); if (issue) throw new Error(issue);
  const raw = await recoverRaw(config, oldPassphrase);
  try { return await protectRawKey(raw, newPassphrase, config.vaultId, config.wrapRevision + 1); }
  finally { raw.fill(0); }
}
export async function encryptCard(card, key, vaultId) {
  const iv = random(12), bytes = encoder.encode(JSON.stringify(card));
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context(`${vaultId}:${card.id}`, 'card'), tagLength: 128 }, key, bytes);
    return { id: card.id, format: VAULT_FORMAT, iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) };
  } finally { bytes.fill(0); }
}
export async function decryptCard(envelope, key, vaultId) {
  if (envelope?.format !== VAULT_FORMAT || typeof envelope.id !== 'string' || !envelope.id || decode(envelope.iv).length !== 12) throw new Error('An encrypted card is damaged or unsupported.');
  let bytes;
  try {
    bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(envelope.iv), additionalData: context(`${vaultId}:${envelope.id}`, 'card'), tagLength: 128 }, key, decode(envelope.ciphertext)));
    const card = JSON.parse(decoder.decode(bytes));
    if (card.id !== envelope.id) throw new Error('Card identity does not match.');
    return card;
  } catch { throw new Error('An encrypted card could not be verified. Nothing has been erased.'); }
  finally { bytes?.fill(0); }
}
