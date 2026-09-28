/**
 * SupportEntry — Floating entry point to the dedicated Software support page.
 * ARCcC: core/studio/private/support-entry/index.js
 *
 * The entry is content-driven and only appears when support is enabled.
 * A configured payment destination receives stronger visual emphasis.
 */
const SupportEntry = (() => {
  let _link = null;
  let _support = null;

  function render(rawSupport) {
    _support = normalizeSupport(rawSupport);
    if (!_support || _support.enabled === false) {
      if (_link) { _link.remove(); _link = null; }
      return;
    }

    if (!_link) {
      _link = document.createElement('a');
      _link.className = 'studio-support';
      _link.id = 'studio-support-btn';
      _link.href = 'support.html';
      document.body.appendChild(_link);
    }

    const label = I18n.tField(_support.buttonLabel) || (I18n.getLang() === 'pt' ? 'Apoie o Lumenia' : 'Support Lumenia');
    const hasPaymentDestination = !!(
      _safeUrl(_support.livepixUrl)
      || _safeUrl(_support.qrImage)
      || String(_support.pixKey || '').trim()
      || (Array.isArray(_support.methods) && _support.methods.some((method) => method && _safeUrl(method.url)))
    );

    _link.setAttribute('aria-label', label);
    _link.setAttribute('title', label);
    _link.classList.toggle('is-active', hasPaymentDestination);
    _link.innerHTML = ''
      + '<span class="studio-support__icon" aria-hidden="true">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>'
      + '</svg></span><span class="studio-support__label">' + _esc(label) + '</span>';
  }

  function _safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const value = url.trim();
    return value.startsWith('assets/') || /^https:\/\//i.test(value) ? value : '';
  }

  function normalizeSupport(raw) {
    return typeof normalizeStudioSupport === 'function' ? normalizeStudioSupport(raw) : raw;
  }

  function _esc(value) {
    return (value === undefined || value === null) ? '' : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({ render });
})();