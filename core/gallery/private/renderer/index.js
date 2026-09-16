/**
 * Gallery Renderer — Builds and injects artwork cards into the DOM.
 * ARCcC: core/gallery/private/renderer/index.js
 */

const GalleryRenderer = (() => {

  const GRID_SELECTOR = '#gallery-grid';
  const ITEMS_PER_PAGE = 3; // Keep at 3 for nice initial load & Load More testing

  let _allArtworks  = [];
  let _activeFilter = 'all';
  let _currentLimit = ITEMS_PER_PAGE;

  /**
   * Initialize event listener for the Load More button.
   */
  function init() {
    const loadMoreBtn = document.getElementById('gallery-load-more');
    loadMoreBtn?.addEventListener('click', () => {
      _currentLimit += ITEMS_PER_PAGE;
      render(_allArtworks, _activeFilter);
    });

    // Listen for age verification to update visual states
    EventBus.on('age.verified', () => {
      document.querySelectorAll('.artwork-card.is-nsfw').forEach((card) => {
        card.classList.remove('is-blurred');
      });
    });
  }

  /**
   * Render artworks into the gallery grid.
   * @param {Artwork[]} artworks
   * @param {string}    activeFilter  — 'all' or category name
   */
  function render(artworks, activeFilter = 'all') {
    _allArtworks  = artworks;
    _activeFilter = activeFilter;

    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;

    // 1. Filter by category
    const filterKey = typeof activeFilter === 'object' ? (activeFilter.en || 'all') : activeFilter;
    let filtered = (filterKey === 'all')
      ? artworks
      : artworks.filter((a) => {
          const catStr = typeof a.category === 'object' ? (a.category.en || '') : a.category;
          return catStr.toLowerCase() === filterKey.toLowerCase();
        });

    // 2. Filter out NSFW if toggle is unchecked
    const showNsfwCheckbox = document.getElementById('nsfw-checkbox');
    const showNsfw = showNsfwCheckbox ? showNsfwCheckbox.checked : false;
    if (!showNsfw) {
      filtered = filtered.filter((a) => !a.nsfw);
    }

    grid.innerHTML = '';

    // 3. Slice to current pagination limit
    const pageItems = filtered.slice(0, _currentLimit);

    pageItems.forEach((artwork, index) => {
      const card = _buildCard(artwork, index);
      grid.appendChild(card);
    });

    // 4. Handle "Load More" visibility
    const loadMoreBtn = document.getElementById('gallery-load-more');
    if (loadMoreBtn) {
      if (filtered.length > _currentLimit) {
        loadMoreBtn.style.display = 'inline-flex';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }

    // Trigger scroll reveal for new cards
    ScrollReveal.observeAll();
  }

  function resetLimit() {
    _currentLimit = ITEMS_PER_PAGE;
  }

  /**
   * Build a single artwork card element.
   * @param {Artwork} artwork
   * @param {number}  index
   * @returns {HTMLElement}
   */
  function _buildCard(artwork, index) {
    const card = document.createElement('article');
    card.className = 'artwork-card reveal reveal-scale';
    card.style.transitionDelay = `${Math.min(index * 60, 400)}ms`;
    card.dataset.artworkId = artwork.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View artwork: ${I18n.tField(artwork.title)}`);

    if (artwork.nsfw) {
      card.classList.add('is-nsfw');
      const isVerified = localStorage.getItem('hb_age_verified') === 'true';
      if (!isVerified) {
        card.classList.add('is-blurred');
      }
    }

    const nsfwOverlay = artwork.nsfw
      ? `<div class="artwork-card__nsfw-badge">18+</div>`
      : '';

    card.innerHTML = `
      <img
        class="artwork-card__image"
        src="${_sanitizeUrl(artwork.imageUrl)}"
        alt="${_sanitizeText(I18n.tField(artwork.title))}"
        loading="lazy"
      />
      ${nsfwOverlay}
      <div class="artwork-card__overlay">
        <span class="artwork-card__category">${_sanitizeText(I18n.tField(artwork.category))}</span>
        <h3 class="artwork-card__title">${_sanitizeText(I18n.tField(artwork.title))}</h3>
        <div class="artwork-card__view-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </div>
      </div>
    `;

    // Open lightbox on click or Enter key, verifying age if NSFW
    card.addEventListener('click', () => _handleCardClick(artwork));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _handleCardClick(artwork);
      }
    });

    return card;
  }


  function _handleCardClick(artwork) {
    if (artwork.nsfw) {
      AgeGate.verify(() => {
        EventBus.emit(EVENTS.ARTWORK_OPEN, artwork);
      });
    } else {
      EventBus.emit(EVENTS.ARTWORK_OPEN, artwork);
    }
  }

  /** Sanitize a URL attribute to prevent injection */
  function _sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (/^(https?:\/\/|data:image\/)/.test(url) || url.startsWith('assets/')) return url;
    return '';
  }

  function _sanitizeText(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({ init, render, resetLimit });
})();
