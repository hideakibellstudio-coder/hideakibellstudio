/**
 * EnvUtils — Detects where the site is running.
 * ARCcC: utils/env/index.js
 *
 * Used to decide which areas of the Creator Studio may be shown.
 * IMPORTANT: this is convenience, not security. Anything that lives in a
 * static repository is public — real protection comes from the content
 * gate (core/admin-gate) and from keeping secrets out of the repo.
 */

const EnvUtils = (() => {

  /**
   * True when running from a local/preview environment
   * (Live Server, python -m http.server, file://, LAN or explicit ?admin flag).
   * @returns {boolean}
   */
  function isLocalDev() {
    return isLocalHost() || hasAdminFlag();
  }

  /**
   * True only for genuine local hosts (no query-flag escape hatch).
   * @returns {boolean}
   */
  function isLocalHost() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '' ||                 // file://
      protocol === 'file:' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    );
  }

  /** True when the URL carries ?admin or ?edit. */
  function hasAdminFlag() {
    const params = new URLSearchParams(window.location.search);
    return params.has('admin') || params.has('edit');
  }

  /**
   * True for a public https deployment (GitHub Pages).
   * @returns {boolean}
   */
  function isPublicDeployment() {
    return !isLocalHost() && window.location.protocol === 'https:';
  }

  return Object.freeze({ isLocalDev, isLocalHost, hasAdminFlag, isPublicDeployment });
})();