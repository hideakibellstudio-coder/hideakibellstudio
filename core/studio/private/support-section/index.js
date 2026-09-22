/**
 * SupportSection — Dedicated payment/support area for the Software page.
 * ARCcC: core/studio/private/support-section/index.js
 *
 * Payment URLs, QR code, Pix key and copy all come from content/studio.json.
 * The section stays hidden until at least one real payment option is ready.
 */

const SupportSection = (() => {

  let _support = null;
  let _bound = false;

  const _t = (en, pt) => (I18n.getLang() === 'pt' ? pt : en);

  function render(rawSupport) {
    _support = normalizeSupport(rawSupport);

    const section = document.getElementById('studio-support-section');
    const mount = document.getElementById('studio-support-content');
    if (!section || !mount) return;

    const available = _hasSomethingToOffer();
    section.toggleAttribute('hidden', !available);
    if (!available) {
      mount.innerHTML = '';
      return;
    }

    const title = I18n.tField(_support.title) || _t('Support the project', 'Apoie o projeto');
    const titleMount = document.getElementById('studio-support-title');
    if (titleMount) titleMount.textContent = title;

    mount.innerHTML = _html();

    if (!_bound) {
      _bindCopy();
      _bound = true;
    }
  }

  function _hasSomethingToOffer() {
    return !!(
      _support &&
      _support.enabled !== false &&
      (_methods().length || _qr() || _pixKey())
    );
  }

  function _qr() {
    return _support ? _safeUrl(_support.qrImage) : '';
  }

  function _pixKey() {
    return _support ? String(_support.pixKey || '').trim() : '';
  }

  function _methods() {
    const list = Array.isArray(_support && _support.methods) ? _support.methods : [];
    const out = list
      .filter((method) => method && _safeUrl(method.url))
      .map((method) => ({
        icon: method.icon || '◆',
        label: I18n.tField(method.label) || method.id || _t('Support', 'Apoiar'),
        note: I18n.tField(method.note),
        url: _safeUrl(method.url),
        primary: !!method.primary,
      }));

    const primaryIndex = out.findIndex((method) => method.primary);
    if (primaryIndex > 0) out.unshift(out.splice(primaryIndex, 1)[0]);
    if (out.length && !out.some((method) => method.primary)) out[0].primary = true;
    return out;
  }

  function _html() {
    const story = I18n.tFieldArray(_support.story).filter(Boolean);
    const qr = _qr();
    const pixKey = _pixKey();
    const caption = I18n.tField(_support.qrCaption);
    const methods = _methods();
    const thanks = I18n.tField(_support.thanks);

    return `
      <div class="studio-support__layout">
        <div class="studio-support__copy">
          ${story.map((paragraph) => `<p class="studio-support__text">${_esc(paragraph)}</p>`).join('')}
          ${thanks ? `<p class="studio-support__thanks">${_esc(thanks)}</p>` : ''}
        </div>

        <div class="studio-support__options">
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
        </div>
      </div>
    `;
  }

  function _bindCopy() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      const button = target && typeof target.closest === 'function'
        ? target.closest('[data-support-copy]')
        : null;
      const section = document.getElementById('studio-support-section');
      if (!button || !section || !section.contains(button)) return;
      event.preventDefault();
      _copyPix(button);
    });
  }

  async function _copyPix(button) {
    const key = _pixKey();
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

  return Object.freeze({ render });
})();
