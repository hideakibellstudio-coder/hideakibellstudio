/**
 * SupportPageModule — Dedicated, content-driven support page for Lumenia.
 * Payment URLs and editable project copy come from content/studio.json.
 */
const SupportPageModule = (() => {
  let _root = null;
  let _support = null;
  let _latestPost = null;

  function init() {
    _root = document.getElementById('support-root');
    if (!_root) return;
    _root.addEventListener('click', _handleClick);
    _load();
    EventBus.on('language.changed', _render);
  }

  function update() {
    _load();
  }

  function _load() {
    const studio = ContentLoader.get('studio') || {};
    _latestPost = Array.isArray(studio.posts)
      ? studio.posts.find((post) => post && _safeUrl(post.image))
      : null;
    _support = typeof normalizeStudioSupport === 'function'
      ? normalizeStudioSupport(studio.support)
      : (studio.support || {});
    _render();
  }

  function _render() {
    if (!_root || !_support) return;

    const title = I18n.tField(_support.title) || _t('Support Lumenia', 'Apoie o Lumenia');
    const story = I18n.tFieldArray(_support.story).filter(Boolean);
    const list = Array.isArray(_support.methods) ? _support.methods : [];
    const livepixMethod = list.find((method) => method && String(method.id || '').toLowerCase() === 'livepix');
    const livepixUrl = _safeUrl(_support.livepixUrl) || _safeUrl(livepixMethod && livepixMethod.url);
    const qrUrl = _safeUrl(_support.qrImage);
    const qrCaption = I18n.tField(_support.qrCaption);
    const pixKey = String(_support.pixKey || '').trim();
    const thanks = I18n.tField(_support.thanks);
    const methods = list.filter((method) =>
      method && !(String(method.id || '').toLowerCase() === 'livepix' && livepixUrl) && _safeUrl(method.url)
    );

    if (_support.enabled === false) {
      _root.innerHTML = '<div class="support-page__empty"><p>' + _esc(I18n.t('support_page_unavailable')) + '</p></div>';
      return;
    }

    const storyHtml = story.map((paragraph) => '<p>' + _esc(paragraph) + '</p>').join('');
    const livepixHtml = livepixUrl
      ? '<a class="support-page__livepix" href="' + _esc(livepixUrl) + '" target="_blank" rel="noopener noreferrer">'
        + '<span class="support-page__livepix-icon" aria-hidden="true">♥</span>'
        + '<span class="support-page__livepix-label"><strong>' + _esc(I18n.t('support_page_livepix_cta')) + '</strong>'
        + '<small>' + _esc(I18n.t('support_page_livepix_note')) + '</small></span>'
        + '<span class="support-page__livepix-arrow" aria-hidden="true">↗</span>'
        + '</a>'
      : '<p class="support-page__unavailable">' + _esc(I18n.t('support_page_unavailable')) + '</p>';

    const alternatives = [];
    if (qrUrl && qrUrl !== livepixUrl) {
      alternatives.push('<figure class="support-page__qr"><img src="' + _esc(qrUrl) + '" alt="' + _esc(I18n.t('studio_support_qr_alt')) + '" loading="lazy" />'
        + (qrCaption ? '<figcaption>' + _esc(qrCaption) + '</figcaption>' : '') + '</figure>');
    }
    if (pixKey) {
      alternatives.push('<div class="support-page__pix"><span class="support-page__option-label">'
        + _esc(_t('Pix copy-and-paste key', 'Chave Pix copia e cola')) + '</span>'
        + '<code>' + _esc(pixKey) + '</code><button type="button" data-support-copy data-copied-label="'
        + _esc(I18n.t('studio_support_copied')) + '">' + _esc(I18n.t('studio_support_copy')) + '</button></div>');
    }
    methods.forEach((method) => {
      const label = I18n.tField(method.label) || method.id || _t('Support', 'Apoiar');
      const note = I18n.tField(method.note);
      alternatives.push('<a class="support-page__method" href="' + _esc(_safeUrl(method.url)) + '" target="_blank" rel="noopener noreferrer">'
        + '<span class="support-page__method-icon" aria-hidden="true">' + _esc(method.icon || '◆') + '</span>'
        + '<span><strong>' + _esc(label) + '</strong>' + (note ? '<small>' + _esc(note) + '</small>' : '') + '</span>'
        + '<span class="support-page__livepix-arrow" aria-hidden="true">↗</span></a>');
    });

    _root.innerHTML = ''
      + '<div class="support-page__hero">'
      + '<div class="support-page__hero-copy">'
      + '<p class="support-page__eyebrow">' + _esc(I18n.t('support_page_eyebrow')) + '</p>'
      + '<h1 class="support-page__title">' + _esc(title) + '</h1>'
      + '<div class="support-page__story">' + storyHtml + '</div>'
      + '<a class="support-page__project-link" href="studio.html#studio-feed">' + _esc(I18n.t('support_page_project_link')) + ' <span aria-hidden="true">↗</span></a>'
      + '</div>'
      + '<figure class="support-page__visual">'
      + '<img src="' + _esc(_safeUrl(_latestPost && _latestPost.image) || 'assets/images/devlog/36_fase12_lumenia_flagship.png') + '" alt="' + _esc(I18n.t('support_page_image_alt')) + '" loading="lazy" />'
      + '<figcaption>' + _esc(I18n.tField(_latestPost && _latestPost.title) || I18n.t('support_page_image_caption')) + '</figcaption>'
      + '</figure>'
      + '</div>'
      + '<section class="support-page__contribution" aria-labelledby="support-contribution-title">'
      + '<div class="support-page__contribution-copy">'
      + '<p class="support-page__eyebrow">' + _esc(I18n.t('support_page_contribution_eyebrow')) + '</p>'
      + '<h2 id="support-contribution-title">' + _esc(I18n.t('support_page_contribution_title')) + '</h2>'
      + '<p>' + _esc(I18n.t('support_page_contribution_text')) + '</p>'
      + '</div>'
      + '<div class="support-page__payment">' + livepixHtml + '</div>'
      + '</section>'
      + (alternatives.length
        ? '<section class="support-page__alternatives" aria-label="' + _esc(I18n.t('support_page_other_options')) + '"><h2>'
          + _esc(I18n.t('support_page_other_options')) + '</h2><div class="support-page__alternative-list">' + alternatives.join('') + '</div></section>'
        : '')
      + '<section class="support-page__transparency">'
      + '<div><p class="support-page__eyebrow">' + _esc(I18n.t('support_page_transparency_eyebrow')) + '</p>'
      + '<h2>' + _esc(I18n.t('support_page_transparency_title')) + '</h2>'
      + '<p>' + _esc(I18n.t('support_page_transparency_text')) + '</p></div>'
      + '<a href="studio.html#studio-feed">' + _esc(I18n.t('support_page_transparency_cta')) + ' <span aria-hidden="true">↗</span></a>'
      + '</section>'
      + (thanks ? '<p class="support-page__thanks">' + _esc(thanks) + '</p>' : '');
  }

  async function _handleClick(event) {
    const button = event.target && event.target.closest('[data-support-copy]');
    const key = String(_support && _support.pixKey || '').trim();
    if (!button || !key) return;

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
        copied = true;
      }
    } catch {}

    if (!copied) copied = _legacyCopy(key);
    if (!copied) return;

    const label = button.getAttribute('data-copied-label') || _t('Copied!', 'Copiado!');
    const original = button.textContent;
    button.textContent = label;
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
    return value.startsWith('assets/') || /^https:\/\//i.test(value) ? value : '';
  }

  function _t(en, pt) {
    return I18n.getLang() === 'pt' ? pt : en;
  }

  function _esc(value) {
    return (value === undefined || value === null) ? '' : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({ init, update });
})();