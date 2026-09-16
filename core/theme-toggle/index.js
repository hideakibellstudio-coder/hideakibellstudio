/**
 * ThemeToggle Module — Public API for dark/light mode switching.
 * ARCcC: core/theme-toggle/index.js
 *
 * Responsibilities:
 *  - Read saved preference from localStorage on boot
 *  - Apply data-theme attribute to <html>
 *  - Build and manage the toggle button in the nav
 *  - Persist preference on toggle
 *  - Update particle accent color via CSS variable
 */

const ThemeToggleModule = (() => {

  const STORAGE_KEY = 'hb_theme';
  const DARK  = 'dark';
  const LIGHT = 'light';

  let _currentTheme = DARK;

  /**
   * Initialize the theme module.
   * Reads saved preference and wires the toggle button.
   * @param {SiteConfig} _config — unused but conforms to SiteContract
   */
  function init(_config) {
    // Preference already applied in <head> inline script to avoid FOUC.
    // Here we just sync the button UI and bind events.
    _currentTheme = document.documentElement.getAttribute('data-theme') || DARK;
    _updateButton();
    _bindToggleButton();
  }

  /**
   * Toggle between dark and light mode.
   */
  function toggle() {
    _currentTheme = _currentTheme === DARK ? LIGHT : DARK;
    document.documentElement.setAttribute('data-theme', _currentTheme);
    localStorage.setItem(STORAGE_KEY, _currentTheme);
    _updateButton();

    // Visual spin feedback
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.classList.remove('is-spinning');
      void btn.offsetWidth; // force reflow
      btn.classList.add('is-spinning');
      setTimeout(() => btn.classList.remove('is-spinning'), 400);
    }

    // Emit so other modules can react if needed
    EventBus.emit('theme.changed', _currentTheme);
  }

  /**
   * Get the currently active theme.
   * @returns {'dark'|'light'}
   */
  function getTheme() {
    return _currentTheme;
  }

  // ── Private ────────────────────────────────────────────────

  function _bindToggleButton() {
    const btn = document.getElementById('theme-toggle-btn');
    btn?.addEventListener('click', toggle);
  }

  function _updateButton() {
    const btn      = document.getElementById('theme-toggle-btn');
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon  = document.getElementById('theme-icon-sun');
    if (!btn) return;

    const isDark = _currentTheme === DARK;

    // Show moon in dark (switch to light), sun in light (switch to dark)
    if (moonIcon) moonIcon.style.display = isDark  ? 'block' : 'none';
    if (sunIcon)  sunIcon.style.display  = !isDark ? 'block' : 'none';

    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title',      isDark ? 'Light mode' : 'Dark mode');
  }

  // Conforms to SiteContract (no update needed for theme module)
  function update() {}

  return Object.freeze({ init, update, toggle, getTheme });
})();
