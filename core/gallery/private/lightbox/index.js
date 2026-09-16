/**
 * Lightbox — Full-screen artwork viewer.
 * ARCcC: core/gallery/private/lightbox/index.js
 */

const Lightbox = (() => {

  let _artworks  = [];
  let _currentIndex = 0;
  let _overlay   = null;
  let _isOpen    = false;

  /** Initialize lightbox DOM and event listeners */
  function init() {
    _overlay = _buildLightbox();
    document.body.appendChild(_overlay);
    _bindEvents();
  }

  /** Set the artworks array (called when config loads/updates) */
  function setArtworks(artworks) {
    _artworks = artworks;
  }

  /** Open lightbox for a given artwork */
  function open(artwork) {
    const idx = _artworks.findIndex((a) => a.id === artwork.id);
    _currentIndex = idx >= 0 ? idx : 0;
    _render(_artworks[_currentIndex]);
    _overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _isOpen = true;

    // Focus trap
    setTimeout(() => _overlay.querySelector('.lightbox-close')?.focus(), 100);
  }

  function close() {
    _overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    _isOpen = false;
  }

  function next() {
    if (!_isOpen || _artworks.length === 0) return;
    _currentIndex = (_currentIndex + 1) % _artworks.length;
    _render(_artworks[_currentIndex]);
  }

  function prev() {
    if (!_isOpen || _artworks.length === 0) return;
    _currentIndex = (_currentIndex - 1 + _artworks.length) % _artworks.length;
    _render(_artworks[_currentIndex]);
  }

  function _render(artwork) {
    const img  = _overlay.querySelector('.lightbox-image');
    const cat  = _overlay.querySelector('.lightbox-info__category');
    const title= _overlay.querySelector('.lightbox-info__title');
    const desc = _overlay.querySelector('.lightbox-info__description');

    if (img)   { img.src = artwork.imageUrl; img.alt = I18n.tField(artwork.title); }
    if (cat)   cat.textContent  = I18n.tField(artwork.category);
    if (title) title.textContent= I18n.tField(artwork.title);
    if (desc)  desc.textContent = I18n.tField(artwork.description);
  }

  /** Re-render the currently open artwork (used on language change) */
  function refresh() {
    if (!_isOpen || _artworks.length === 0) return;
    _render(_artworks[_currentIndex]);
  }

  function _buildLightbox() {
    const el = document.createElement('div');
    el.className = 'lightbox-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Artwork viewer');

    el.innerHTML = `
      <button class="lightbox-close" aria-label="Close lightbox">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <button class="lightbox-nav lightbox-nav--prev" aria-label="Previous artwork">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <button class="lightbox-nav lightbox-nav--next" aria-label="Next artwork">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      <div class="lightbox-container">
        <img class="lightbox-image" src="" alt="" />
        <div class="lightbox-info">
          <p class="lightbox-info__category"></p>
          <h2 class="lightbox-info__title"></h2>
          <p class="lightbox-info__description"></p>
        </div>
      </div>
    `;

    return el;
  }

  function _bindEvents() {
    // EventBus subscriptions
    EventBus.on(EVENTS.ARTWORK_OPEN,  (artwork) => open(artwork));
    EventBus.on(EVENTS.ARTWORK_CLOSE, ()         => close());
    EventBus.on(EVENTS.ARTWORK_NEXT,  ()         => next());
    EventBus.on(EVENTS.ARTWORK_PREV,  ()         => prev());

    // Close button
    _overlay.querySelector('.lightbox-close').addEventListener('click', close);

    // Nav buttons
    _overlay.querySelector('.lightbox-nav--prev').addEventListener('click', prev);
    _overlay.querySelector('.lightbox-nav--next').addEventListener('click', next);

    // Click backdrop to close
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) close();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!_isOpen) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  prev();
    });
  }

  return Object.freeze({ init, open, close, next, prev, setArtworks });
})();
