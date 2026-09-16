/**
 * Settings Panel Persistence — localStorage read/write.
 * ARCcC: core/settings-panel/private/persistence/index.js
 *
 * Note: accent color default is #FF3EA5 (Hideaki Bell brand pink).
 */

const SettingsPersistence = (() => {

  const STORAGE_KEY = 'hb_portfolio_config';

  function save(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('[SettingsPersistence] Failed to save:', err);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return Object.freeze({ save, load, clear });
})();
