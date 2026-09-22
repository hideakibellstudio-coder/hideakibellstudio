/**
 * Studio Renderer — Fills the Software Area layout with content.
 * ARCcC: core/studio/private/renderer/index.js
 *
 * The page owns the layout; this renderer only fills the mount points it
 * finds. Every section is optional: if the corresponding array in the
 * content is empty, its wrapper (`[data-studio-section]`) is hidden.
 *
 * Mount points (all optional):
 *   [data-studio="name"|"tagline"|"status"|"version"]      → text
 *   img[data-studio="hero-image"]                          → image src
 *   [data-studio="intro"]                                  → paragraphs
 *   #studio-highlights, #studio-roadmap, #studio-posts, #studio-links
 *   a[data-studio="cta"]                                   → label + href
 */

const StudioRenderer = (() => {

  let _content = null;

  /**
   * Render (or re-render) the Software Area.
   * @param {StudioContent} rawContent
   */
  function render(rawContent) {
    _content = normalizeStudioContent(rawContent);
    if (!document.getElementById('studio-root')) return;

    _renderMeta();
    _renderIntro();
    _renderHighlights();
    _renderRoadmap();
    _renderPosts();
    _renderLinks();
  }

  // ── Sections ────────────────────────────────────────────────

  function _renderMeta() {
    const { meta } = _content;

    _setText('[data-studio="name"]',    I18n.tField(meta.name));
    _setText('[data-studio="tagline"]', I18n.tField(meta.tagline));
    _setText('[data-studio="status"]',  I18n.tField(meta.status));
    _setText('[data-studio="version"]', meta.version ? `v${meta.version}` : '');

    const hero = document.querySelector('img[data-studio="hero-image"]');
    if (hero) {
      const url = _safeUrl(meta.heroImage);
      if (url) hero.src = url;
      else hero.removeAttribute('src');
      hero.alt = I18n.tField(meta.name) || '';
      hero.setAttribute('data-media', 'image');
      hero.setAttribute('role', 'button');
      hero.setAttribute('tabindex', '0');
      hero.setAttribute('aria-label', _t('View fullscreen', 'Ver em tela cheia'));
      _toggleSection(hero, !!url);
    }

    const cta = document.querySelector('a[data-studio="cta"]');
    if (cta) {
      const label = I18n.tField(meta.cta && meta.cta.label) || I18n.t('studio_cta');
      const href  = (meta.cta && meta.cta.url) || '#studio-feed';
      cta.textContent = label;
      if (!/^javascript:/i.test(href)) cta.setAttribute('href', href);
      cta.toggleAttribute('hidden', !label);
    }
  }

  function _renderIntro() {
    const mount = document.querySelector('[data-studio="intro"]');
    if (!mount) return;

    const paras = I18n.tFieldArray(_content.intros).filter(Boolean);
    mount.innerHTML = paras
      .map((p) => `<p class="studio__paragraph">${_esc(p)}</p>`)
      .join('');

    _toggleSection(mount, paras.length > 0);
  }

  function _renderHighlights() {
    const mount = document.getElementById('studio-highlights');
    if (!mount) return;

    mount.innerHTML = _content.highlights.map((item) => `
      <article class="studio-card">
        <div class="studio-card__icon" aria-hidden="true">${_esc(item.icon || '✦')}</div>
        <h3 class="studio-card__title">${_esc(I18n.tField(item.title))}</h3>
        <p class="studio-card__text">${_esc(I18n.tField(item.text))}</p>
      </article>
    `).join('');

    _toggleSection(mount, _content.highlights.length > 0);
  }

  function _renderRoadmap() {
    const mount = document.getElementById('studio-roadmap');
    if (!mount) return;

    mount.innerHTML = _content.roadmap.map((step) => `
      <li class="studio-roadmap__item${step.done ? ' is-done' : ''}">
        <span class="studio-roadmap__phase">${_esc(step.phase || '')}</span>
        <span class="studio-roadmap__title">${_esc(I18n.tField(step.title))}</span>
        <span class="studio-roadmap__mark" aria-hidden="true">${step.done ? '✓' : '·'}</span>
      </li>
    `).join('');

    _toggleSection(mount, _content.roadmap.length > 0);
  }

  function _renderPosts() {
    const mount = document.getElementById('studio-posts');
    if (!mount) return;

    const posts = _content.posts
      .slice()
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    if (!posts.length) {
      mount.innerHTML = '';
      _toggleSection(mount, false);
      return;
    }

    const total = posts.length;
    const slides = posts.map((post, i) => _postHtml(post, i, total)).join('');
    const dots = posts.map((post, i) => `
      <button class="devlog__dot" type="button" data-devlog-goto="${i}"
              aria-current="${i === 0 ? 'true' : 'false'}"
              aria-label="${_esc(_t('Entry', 'Entrada'))} ${i + 1} — ${_esc(I18n.tField(post.tag))}">
        <span aria-hidden="true"></span>
      </button>
    `).join('');

    // One entry per view (the page stays short); every entry remains in the DOM
    // so search engines and screen readers still reach the whole devlog, and the
    // "view all" toggle restores the plain vertical list.
    mount.innerHTML = `
      <div class="devlog" data-devlog data-devlog-mode="carousel">
        <div class="devlog__bar">
          <button class="devlog__nav" type="button" data-devlog-prev aria-label="${_esc(I18n.t('studio_feed_prev'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
            <span class="devlog__nav-label">${_esc(I18n.t('studio_feed_prev_hint'))}</span>
          </button>

          <p class="devlog__status">
            <span class="devlog__counter" data-devlog-counter aria-live="polite">1 / ${total}</span>
            <span class="devlog__current" data-devlog-current></span>
          </p>

          <button class="devlog__nav" type="button" data-devlog-next aria-label="${_esc(I18n.t('studio_feed_next'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
            <span class="devlog__nav-label">${_esc(I18n.t('studio_feed_next_hint'))}</span>
          </button>

          <button class="devlog__viewall" type="button" data-devlog-viewall aria-pressed="false">${_esc(I18n.t('studio_feed_view_all'))}</button>
        </div>

        <div class="devlog__viewport" data-devlog-viewport tabindex="0" role="group"
             aria-roledescription="${_esc(_t('carousel', 'carrossel'))}"
             aria-label="${_esc(I18n.t('studio_feed_title'))}">
          <div class="devlog__track" data-devlog-track>${slides}</div>
        </div>

        <div class="devlog__dots" data-devlog-dots aria-label="${_esc(I18n.t('studio_feed_dots'))}">${dots}</div>
      </div>
    `;

    _toggleSection(mount, true);
  }

  /** One devlog entry as a carousel slide (ids are preserved for #post-N links). */
  function _postHtml(post, index, total) {
    const image = _safeUrl(post.image);
    const link  = _safeUrl(post.link);
    const video = _videoEmbed(post.video);
    const fsBtn = `<button class="studio-post__fs" type="button" data-media-fs aria-label="${_esc(_t('Fullscreen', 'Tela cheia'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>`;
    const videoHtml = video
      ? (/\.(mp4|webm|ogv|mov)(\?.*)?$/i.test(video)
        ? `<div class="studio-post__video"><video controls preload="metadata" src="${_esc(video)}"></video>${fsBtn}</div>`
        : `<div class="studio-post__video"><iframe src="${_esc(video)}" title="${_esc(I18n.tField(post.title))}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>${fsBtn}</div>`)
      : '';

    // Only the visible slide is exposed to assistive tech / keyboard (inert)
    const active = index === 0;

    return `
      <article class="studio-post devlog__slide" id="${_esc(post.id || '')}" data-devlog-slide
               aria-label="${index + 1} / ${total}"${active ? '' : ' aria-hidden="true" inert'}>
        <header class="studio-post__head">
          <span class="studio-post__tag">${_esc(I18n.tField(post.tag))}</span>
          <time class="studio-post__date" datetime="${_esc(post.date || '')}">${_esc(_formatDate(post.date))}</time>
        </header>
        <h3 class="studio-post__title">${_esc(I18n.tField(post.title))}</h3>
        ${image ? `<img class="studio-post__image" src="${image}" alt="" loading="lazy" data-media="image" role="button" tabindex="0" aria-label="${_esc(_t('View fullscreen', 'Ver em tela cheia'))}" />` : ''}
        ${videoHtml}
        <p class="studio-post__body">${_esc(I18n.tField(post.body))}</p>
        ${link ? `<a class="studio-post__link" href="${link}" target="_blank" rel="noopener">${_esc(I18n.t('studio_read_more'))}</a>` : ''}
      </article>
    `;
  }

  function _renderLinks() {
    const mount = document.getElementById('studio-links');
    if (!mount) return;

    const links = _content.links.filter((l) => _safeUrl(l.url));
    mount.innerHTML = links.map((link) => `
      <a class="studio-link" href="${_safeUrl(link.url)}" target="_blank" rel="noopener">
        <span class="studio-link__icon" aria-hidden="true">${_esc(link.icon || '◆')}</span>
        <span class="studio-link__label">${_esc(link.label || '')}</span>
      </a>
    `).join('');

    _toggleSection(mount, links.length > 0);
  }

  // ── Helpers ─────────────────────────────────────────────────

  function _setText(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = value || '';
    if (el.hasAttribute('data-studio-optional')) el.toggleAttribute('hidden', !value);
  }

  function _toggleSection(el, visible) {
    const section = el.closest('[data-studio-section]') || el;
    section.toggleAttribute('hidden', !visible);
  }

  function _safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (/^(https?:\/\/|mailto:|#)/i.test(url) || url.startsWith('assets/')) return url;
    return '';
  }

  /**
   * Normalize a video reference into something embeddable.
   * Accepts:
   *   - direct media files:  https://…/clip.mp4|.webm|.ogv|.mov
   *   - YouTube watch/share: youtube.com/watch?v=ID · youtu.be/ID (incl. Shorts)
   *   - Vimeo:               vimeo.com/ID
   * Returns an <embed-safe> URL for iframes, the raw file URL for <video>,
   * or '' when the reference is not recognized (fail closed).
   */
  function _videoEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();

    // Direct media file → returned as-is (rendered via <video>)
    if (/^https:\/\/[^\s]+\.(mp4|webm|ogv|mov|m4v)(\?[^\s]*)?$/i.test(u)) return u;

    // YouTube (watch, youtu.be, Shorts, embed) → canonical embed URL
    let m = u.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,20})/i)
         || u.match(/^https:\/\/(?:www\.)?youtube\.com\/(?:shorts|embed)\/([\w-]{6,20})/i)
         || u.match(/^https:\/\/youtu\.be\/([\w-]{6,20})/i);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;

    // Vimeo → player embed
    m = u.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d{6,12})/i);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;

    return '';
  }

  function _formatDate(iso) {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString(I18n.getLang() === 'pt' ? 'pt-BR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  function _esc(str) {
    return (str === undefined || str === null) ? '' : String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Bilingual inline label (module-local strings, no i18n key needed). */
  function _t(en, pt) { return I18n.getLang() === 'pt' ? pt : en; }

  return Object.freeze({ render });
})();
