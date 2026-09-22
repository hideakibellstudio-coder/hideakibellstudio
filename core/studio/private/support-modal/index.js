/**
 * SupportModal — Floating support button + donation modal for the Software Area.
 * ARCcC: core/studio/private/support-modal/index.js
 *
 * Why: the software is an independent, solo, full-time project, so readers who
 * want to help need a quiet, always-available entry point — without stealing
 * space from the devlog they came to read.
 *
 * Rules:
 *   · The floating button is available whenever support is enabled, even
 *     before a payment link or QR image has been configured.
 *   · The modal keeps the project explanation and payment options in one place.
 *   · Content-driven — every text, QR and link comes from content/studio.json
 *     (`support`), so nothing about payments is hardcoded here.
 *
 * Security: URLs pass the same allowlist as the rest of the area (assets/ or
 * https), interpolation is escaped, and the module never injects inline script
 * (the site ships a strict CSP).
 */

const SupportModal = (() => {

  let _fab        = null;
  let _dialog     = null;
  let _support    = null;
  let _isOpen     = false;
  let _lastFocus  = null;
  let _bound      = false;

  const _t = (en, pt) => (I18n.getLang() === 'pt' ? pt : en);

  // ── Public API ─────────────────────────────────────────────

  /**
   * Render (or refresh) the button and its modal from the support content.
   * Called after every render of the Software Area, so it follows the
   * language switch and live content updates.
   * @param {StudioSupport} rawSupport
   */
  function render(rawSupport) {
    _support = normalizeSupport(rawSupport);

    if (!_hasSomethingToOffer()) {
      _remove();
      return;
    }

    _ensureElements();
    _updateFab();
    _updateDialog();

    if (!_bound) {
      _bindDocument();
      _bound = true;
    }
  }

  function open() {
    if (!_dialog || _isOpen) return;
    _lastFocus = document.activeElement;

    _dialog.removeAttribute('hidden');
    _dialog.classList.add('is-open');
    document.body.classList.add('is-support-open');
    _isOpen = true;

    setTimeout(() => _dialog.querySelector('[data-support-close]')?.focus(), 40);
  }

  function close() {
    if (!_dialog || !_isOpen) return;

    _dialog.classList.remove('is-open');
    _dialog.setAttribute('hidden', '');
    document.body.classList.remove('is-support-open');
    _isOpen = false;

    if (_lastFocus && typeof _lastFocus.focus === 'function') _lastFocus.focus();
    _lastFocus = null;
  }

  // ── Content checks ─────────────────────────────────────────

  function _hasSomethingToOffer() {
    return !!(_support && _support.enabled !== false);
  }

  function _qr() {
    if (!_support) return '';
    const qr = _safeUrl(_support.qrImage);
    const methods = Array.isArray(_support.methods) ? _support.methods : [];
    const livepix = _safeUrl(_support.livepixUrl)
      || _safeUrl(methods.find((method) => method && String(method.id || '').toLowerCase() === 'livepix')?.url);
    return qr && qr !== livepix ? qr : '';
  }

  /** Methods with a usable URL, primary first. */
  function _methods() {
    const list = Array.isArray(_support && _support.methods) ? _support.methods : [];
    const legacyLivePix = list.find((method) => method && String(method.id || '').toLowerCase() === 'livepix');
    const livepixUrl = _safeUrl(_support && _support.livepixUrl) || _safeUrl(legacyLivePix && legacyLivePix.url);
    const out = list
      .filter((method) => method && !(String(method.id || '').toLowerCase() === 'livepix' && livepixUrl) && _safeUrl(method.url))
      .map((method) => ({
        icon: method.icon || '◆',
        label: I18n.tField(method.label) || method.id || _t('Support', 'Apoiar'),
        note: I18n.tField(method.note),
        url: _safeUrl(method.url),
        primary: !!method.primary,
      }));

    if (livepixUrl) {
      out.unshift({
        icon: (legacyLivePix && legacyLivePix.icon) || '💗',
        label: I18n.tField(legacyLivePix && legacyLivePix.label) || 'LivePix',
        note: I18n.tField(legacyLivePix && legacyLivePix.note) || _t('Pix · cards · international', 'Pix · cartão · internacional'),
        url: livepixUrl,
        primary: legacyLivePix ? legacyLivePix.primary !== false : true,
      });
    }

    const primaryIndex = out.findIndex((method) => method.primary);
    if (primaryIndex > 0) out.unshift(out.splice(primaryIndex, 1)[0]);
    if (out.length && !out.some((method) => method.primary)) out[0].primary = true;
    return out;
  }

  // ── Elements ───────────────────────────────────────────────

  function _ensureElements() {
    if (!_fab) {
      _fab = document.createElement('button');
      _fab.type = 'button';
      _fab.className = 'studio-support';
      _fab.id = 'studio-support-btn';
      _fab.setAttribute('aria-haspopup', 'dialog');
      document.body.appendChild(_fab);
    }

    if (!_dialog) {
      _dialog = document.createElement('div');
      _dialog.className = 'support-modal';
      _dialog.id = 'studio-support-modal';
      _dialog.setAttribute('role', 'dialog');
      _dialog.setAttribute('aria-modal', 'true');
      _dialog.setAttribute('aria-labelledby', 'studio-support-title');
      _dialog.setAttribute('hidden', '');
      _dialog.innerHTML = `
        <div class="support-modal__panel">
          <button class="support-modal__close" type="button" data-support-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div class="support-modal__scroll"></div>
        </div>
      `;
      document.body.appendChild(_dialog);
    }
  }

  function _remove() {
    close();
    if (_fab)    { _fab.remove();    _fab = null; }
    if (_dialog) { _dialog.remove(); _dialog = null; }
  }

  function _updateFab() {
    const label = I18n.tField(_support.buttonLabel) || _t('Support the project', 'Apoiar o projeto');

    _fab.setAttribute('aria-label', label);
    _fab.setAttribute('title', label);
    _fab.innerHTML = `
      <span class="studio-support__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.6"/>
          <rect x="14" y="3" width="7" height="7" rx="1.6"/>
          <rect x="3" y="14" width="7" height="7" rx="1.6"/>
          <rect x="14.5" y="14.5" width="2.6" height="2.6" rx="0.7"/>
          <rect x="18.4" y="18.4" width="2.6" height="2.6" rx="0.7"/>
          <path d="M14.5 18.4h2.1M21 14.5v2.1"/>
        </svg>
      </span>
      <span class="studio-support__label" aria-hidden="true">${_esc(label)}</span>
    `;
  }

  function _updateDialog() {
    const closeBtn = _dialog.querySelector('[data-support-close]');
    if (closeBtn) closeBtn.setAttribute('aria-label', I18n.t('studio_support_close'));

    const scroll = _dialog.querySelector('.support-modal__scroll');
    if (scroll) {
      scroll.innerHTML = _dialogHtml();
      scroll.querySelectorAll('.support-qr__image').forEach((image) => {
        image.addEventListener('error', () => image.closest('.support-qr')?.setAttribute('hidden', ''), { once: true });
      });
    }
  }

  // ── Markup ─────────────────────────────────────────────────

  function _dialogHtml() {
    const title = I18n.tField(_support.title) || _t('Support this independent project', 'Apoie este projeto independente');
    const story = I18n.tFieldArray(_support.story).filter(Boolean);
    const qr = _qr();
    const caption = I18n.tField(_support.qrCaption);
    const pixKey = String(_support.pixKey || '').trim();
    const methods = _methods();
    const thanks = I18n.tField(_support.thanks);
    const hasPaymentOptions = !!(qr || pixKey || methods.length);

    return `
      <p class="support-modal__eyebrow">${_esc(I18n.t('studio_support_eyebrow'))}</p>
      <h2 class="support-modal__title" id="studio-support-title">${_esc(title)}</h2>

      ${story.map((paragraph) => `<p class="support-modal__text">${_esc(paragraph)}</p>`).join('')}

      <section class="support-payment-options" aria-label="${_esc(I18n.t('studio_support_options_title'))}">
        <h3 class="support-payment-options__title">${_esc(I18n.t('studio_support_options_title'))}</h3>
        ${qr ? `
        <figure class="support-qr">
          <img class="support-qr__image" src="${_esc(qr)}" alt="${_esc(I18n.t('studio_support_qr_alt'))}" loading="lazy" />
          ${caption ? `<figcaption class="support-qr__caption">${_esc(caption)}</figcaption>` : ''}
        </figure>` : ''}

        ${pixKey ? `
        <div class="support-pix">
          <code class="support-pix__key">${_esc(pixKey)}</code>
          <button class="support-pix__copy" type="button" data-support-copy
                  data-copied-label="${_esc(I18n.t('studio_support_copied'))}">${_esc(I18n.t('studio_support_copy'))}</button>
        </div>` : ''}

        ${methods.length ? `
        <div class="support-methods">
          ${methods.map((method) => `
            <a class="support-method${method.primary ? ' is-primary' : ''}" href="${_esc(method.url)}" target="_blank" rel="noopener noreferrer">
              <span class="support-method__icon" aria-hidden="true">${_esc(method.icon)}</span>
              <span class="support-method__body">
                <span class="support-method__label">${_esc(method.label)}</span>
                ${method.note ? `<span class="support-method__note">${_esc(method.note)}</span>` : ''}
              </span>
              <span class="support-method__arrow" aria-hidden="true">↗</span>
            </a>`).join('')}
        </div>` : ''}

        ${!hasPaymentOptions ? `<p class="support-payment-options__empty">${_esc(I18n.t('studio_support_options_empty'))}</p>` : ''}
      </section>

      ${thanks ? `<p class="support-modal__thanks">${_esc(thanks)}</p>` : ''}
    `;
  }

  // ── Events ─────────────────────────────────────────────────

  function _bindDocument() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;

      if (target.closest('#studio-support-btn')) { e.preventDefault(); open(); return; }
      if (!_isOpen) return;

      if (target.closest('[data-support-close]')) { e.preventDefault(); close(); return; }
      if (target === _dialog) { close(); return; }               // backdrop click

      const copyBtn = target.closest('[data-support-copy]');
      if (copyBtn) { e.preventDefault(); _copyPix(copyBtn); }
    });

    // ESC closes and Tab stays inside the dialog while it is open
    document.addEventListener('keydown', (e) => {
      if (!_isOpen) return;

      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;

      const focusables = Array.from(_dialog.querySelectorAll('a[href], button:not([disabled])'));
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /** Copy the Pix key (clipboard API, with a legacy fallback). */
  async function _copyPix(button) {
    const key = String((_support && _support.pixKey) || '').trim();
    if (!key) return;

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
        copied = true;
      }
    } catch { copied = false; }
    if (!copied) copied = _legacyCopy(key);
    if (!copied) return;

    const doneLabel = button.getAttribute('data-copied-label') || _t('Copied!', 'Copiado!');
    const original = button.textContent;
    button.textContent = doneLabel;
    button.classList.add('is-copied');
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('is-copied');
    }, 2200);
  }

  function _legacyCopy(text) {
    try {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.top = '-1000px';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand && document.execCommand('copy');
      field.remove();
      return !!copied;
    } catch {
      return false;
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  /** Same allowlist as the rest of the area, tightened to https (fail closed). */
  function _safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const value = url.trim();
    if (value.startsWith('assets/') || /^https:\/\//i.test(value)) return value;
    return '';
  }

  function normalizeSupport(raw) {
    return (typeof normalizeStudioSupport === 'function')
      ? normalizeStudioSupport(raw)
      : raw;
  }

  function _esc(str) {
    return (str === undefined || str === null) ? '' : String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({ render, open, close });
})();
