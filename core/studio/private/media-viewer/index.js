/**
 * MediaViewer — Fullscreen viewer for Software Area media (captures & videos).
 * ARCcC: core/studio/private/media-viewer/index.js
 *
 * Why: captures and videos are 16:9 (recorded on the PC), which renders small
 * on mobile. Tapping any post media opens a full-viewport viewer, and where
 * the Fullscreen API is available the ⛶ button goes true fullscreen (hiding
 * the browser chrome); on iOS the overlay already covers the viewport, so the
 * visitor can simply rotate the phone for landscape/portrait viewing.
 *
 * Kinds:
 *   image → enlarged <img> (tap/click the media again to close)
 *   video → <video controls autoplay> for direct .mp4/.webm links
 *   embed → <iframe> recreated from the post's YouTube/Vimeo embed URL
 *
 * Clicks are delegated on `document`, so content/language re-renders never
 * require rebinding. URLs were already validated by the renderer (`_safeUrl`
 * / `_videoEmbed`) and the site CSP allows https media/frames.
 */

const MediaViewer = (() => {

  let _overlay = null;
  let _stage   = null;
  let _isOpen  = false;
  let _kind    = '';

  const FS_SUPPORTED = typeof document !== 'undefined' && !!(
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  );

  function _t(en, pt) { return I18n.getLang() === 'pt' ? pt : en; }

  // ── Public API ─────────────────────────────────────────────

  function init() {
    if (_overlay) return;
    _overlay = _build();
    document.body.appendChild(_overlay);
    _stage = _overlay.querySelector('.mviewer__stage');
    _bind();
  }

  /**
   * Open the viewer.
   * @param {{kind: 'image'|'video'|'embed', src: string, title?: string}} media
   */
  function open(media) {
    if (!_overlay || !media || !media.src) return;
    _kind = media.kind || 'image';
    _stage.innerHTML = _stageHtml(media);
    _overlay.querySelector('.mviewer__hint').textContent =
      _kind === 'image' ? _t('Rotate your phone to fill the screen', 'Gire o celular para preencher a tela') : '';
    _overlay.classList.add('is-open');
    _overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    _isOpen = true;
    setTimeout(() => _overlay.querySelector('.mviewer__close')?.focus(), 50);
  }

  function close() {
    if (!_isOpen) return;
    _stage.innerHTML = ''; // stops video/iframe playback immediately
    _overlay.classList.remove('is-open');
    _overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
    _isOpen = false;
    _kind = '';
    if (document.fullscreenElement) document.exitFullscreen?.();
  }

  // ── Internals ──────────────────────────────────────────────

  function _stageHtml(media) {
    const title = _esc(media.title || '');
    if (media.kind === 'image') {
      return `<img class="mviewer__media" src="${_esc(media.src)}" alt="${title}" />`;
    }
    if (media.kind === 'video') {
      return `<video class="mviewer__media" src="${_esc(media.src)}" controls autoplay playsinline></video>`;
    }
    return `<iframe class="mviewer__media" src="${_esc(media.src)}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }

  function _toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      const req = document.documentElement.requestFullscreen ||
                  document.documentElement.webkitRequestFullscreen;
      try { const p = req?.call(document.documentElement); if (p && p.catch) p.catch(() => {}); } catch { /* unsupported */ }
    }
  }

  function _build() {
    const el = document.createElement('div');
    el.className = 'mviewer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', _t('Media viewer', 'Visualizador de mídia'));
    el.setAttribute('hidden', '');
    el.innerHTML = `
      <button class="mviewer__close" type="button" aria-label="${_t('Close', 'Fechar')}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      ${FS_SUPPORTED ? `
      <button class="mviewer__fs" type="button" aria-label="${_t('Fullscreen', 'Tela cheia')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
        </svg>
      </button>` : ''}
      <p class="mviewer__hint" aria-hidden="true"></p>
      <div class="mviewer__stage"></div>
    `;
    return el;
  }

  function _bind() {
    // Delegated clicks — works for every (re)render of the feed
    document.addEventListener('click', (e) => {
      const img = e.target.closest?.('img[data-media="image"]');
      if (img) {
        e.preventDefault();
        open({ kind: 'image', src: img.currentSrc || img.src, title: img.alt });
        return;
      }

      const fs = e.target.closest?.('[data-media-fs]');
      if (fs) {
        const wrap   = fs.closest('.studio-post__video');
        const iframe = wrap && wrap.querySelector('iframe');
        const video  = wrap && wrap.querySelector('video');
        if (iframe) open({ kind: 'embed', src: iframe.getAttribute('src'), title: iframe.title });
        else if (video) open({ kind: 'video', src: video.getAttribute('src') });
        return;
      }

      if (!_isOpen) return;
      // Close on backdrop, on the ✕ button, or on tapping an image again
      if (e.target === _overlay || e.target.classList.contains('mviewer__stage')) { close(); return; }
      if (_kind === 'image' && e.target.classList.contains('mviewer__media')) close();
    });

    _overlay.querySelector('.mviewer__close').addEventListener('click', close);
    _overlay.querySelector('.mviewer__fs')?.addEventListener('click', _toggleFullscreen);

    document.addEventListener('keydown', (e) => {
      if (_isOpen && e.key === 'Escape') { close(); return; }
      // Keyboard access for role="button" images
      const img = e.target.closest?.('img[data-media="image"]');
      if (img && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        open({ kind: 'image', src: img.currentSrc || img.src, title: img.alt });
      }
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

  return Object.freeze({ init, open, close });
})();
