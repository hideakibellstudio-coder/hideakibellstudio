/**
 * AdminGate — Local passphrase gate for the Creator Studio.
 * ARCcC: core/admin-gate/index.js
 *
 * WHAT THIS IS: a convenience lock. It stops a curious visitor from poking
 * around the studio UI and keeps the owner's session separate.
 *
 * WHAT THIS IS NOT: real server-side authentication. GitHub Pages is static,
 * so there is no backend to enforce anything. The ONLY secrets that actually
 * protect the published site are the GitHub credentials used to push content —
 * and those must never be committed to this repository.
 *
 * Storage:
 *   localStorage   : hb_admin_gate     → { algo, hash, createdAt } (hash only)
 *   sessionStorage : hb_admin_unlocked → '1' while the tab session is open
 */

const AdminGate = (() => {

  const STORE_KEY   = 'hb_admin_gate';
  const SESSION_KEY = 'hb_admin_unlocked';
  /** Static pepper: raises the cost of a rainbow-table lookup. Not a secret. */
  const PEPPER = 'hideaki-bell::creator-studio::v1';

  /** @returns {boolean} true when a passphrase has been defined in this browser */
  function isConfigured() {
    return !!_readRecord();
  }

  /** @returns {boolean} true while this tab session is unlocked */
  function isUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Define the passphrase for the first time and unlock the session.
   * @param {string} passphrase
   * @returns {Promise<boolean>}
   */
  async function setPassphrase(passphrase) {
    if (!passphrase || passphrase.length < 4) return false;
    const record = await _digest(passphrase);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(record));
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (err) {
      console.warn('[AdminGate] Could not persist passphrase:', err);
      return false;
    }
    EventBus.emit('admin.unlocked', { configured: true });
    return true;
  }

  /**
   * Try to unlock the current session.
   * @param {string} passphrase
   * @returns {Promise<boolean>}
   */
  async function unlock(passphrase) {
    const record = _readRecord();
    if (!record) return false;

    const ok = await _verify(passphrase, record);
    if (ok) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
      EventBus.emit('admin.unlocked', { configured: true });
    }
    return ok;
  }

  /** Replace the passphrase (requires the current one). */
  async function changePassphrase(current, next) {
    const record = _readRecord();
    if (!record) return setPassphrase(next);
    if (!(await _verify(current, record))) return false;
    return setPassphrase(next);
  }

  /** Lock the current session (keeps the stored passphrase). */
  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    EventBus.emit('admin.locked');
  }

  /** Forget the passphrase entirely (back to first-run state). */
  function reset() {
    try {
      localStorage.removeItem(STORE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  // ── Hashing ─────────────────────────────────────────────────

  /**
   * Hash a passphrase, preferring SHA-256 (available on https and localhost).
   * @param {string} text
   * @returns {Promise<{algo: string, hash: string, createdAt: string}>}
   */
  async function _digest(text) {
    const salted = PEPPER + '|' + text;

    if (window.crypto && window.crypto.subtle) {
      try {
        const bytes = new TextEncoder().encode(salted);
        const buf   = await window.crypto.subtle.digest('SHA-256', bytes);
        const hash  = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return { algo: 'sha256', hash, createdAt: new Date().toISOString() };
      } catch (err) {
        console.warn('[AdminGate] WebCrypto unavailable, falling back to local hash.');
      }
    }

    // Fallback for file:// where crypto.subtle is not exposed.
    return { algo: 'local', hash: _localHash(salted), createdAt: new Date().toISOString() };
  }

  async function _verify(passphrase, record) {
    const candidate = await _digest(passphrase);
    if (candidate.algo === record.algo) return candidate.hash === record.hash;
    // Different environments can produce different algorithms — compare both.
    return _localHash(PEPPER + '|' + passphrase) === record.hash;
  }

  /**
   * Deterministic non-cryptographic hash (FNV-1a, 3 rounds).
   * Only used when WebCrypto is unavailable (file:// previews).
   * @param {string} str
   * @returns {string}
   */
  function _localHash(str) {
    let seed = str;
    let out = '';
    for (let round = 0; round < 3; round++) {
      let h = 0x811c9dc5;
      const input = seed + '#' + round;
      for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      out += (h >>> 0).toString(16).padStart(8, '0');
    }
    return out;
  }

  function _readRecord() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.hash ? parsed : null;
    } catch {
      return null;
    }
  }

  return Object.freeze({
    isConfigured, isUnlocked,
    setPassphrase, unlock, changePassphrase, lock, reset,
  });
})();