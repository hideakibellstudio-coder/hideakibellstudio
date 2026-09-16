/**
 * Theme bootstrap — applies the saved theme before first paint (anti-FOUC).
 * External on purpose: keeps `script-src 'self'` in the CSP viable.
 * ARCcC: assets/js/theme-init.js
 */
(function () {
  try {
    var t = localStorage.getItem('hb_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();