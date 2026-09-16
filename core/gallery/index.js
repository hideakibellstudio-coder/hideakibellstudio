/**
 * Gallery Module — Public API.
 * ARCcC: core/gallery/index.js
 *
 * Orchestrates: GalleryRenderer, Lightbox, GalleryFilter.
 * Exposes: init(config), update(config)
 * Communicates: via EventBus (GALLERY_FILTER, ARTWORK_OPEN/CLOSE)
 */

const GalleryModule = (() => {

  let _artworks = [];

  /**
   * Initialize gallery with config.
   * @param {SiteConfig} config
   */
  function init(config) {
    _artworks = validateArtworks(config.artworks);

    // Init sub-modules
    AgeGate.init();
    GalleryRenderer.init();
    GalleryFilter.init(_artworks);
    Lightbox.init();

    // Set initial artworks inside Lightbox based on NSFW preference
    _updateLightboxArtworks('all');

    // Initial render (all artworks)
    GalleryRenderer.render(_artworks, 'all');

    // Subscribe to filter changes
    EventBus.on(EVENTS.GALLERY_FILTER, (category) => {
      GalleryRenderer.resetLimit();
      GalleryRenderer.render(_artworks, category);
      _updateLightboxArtworks(category);
    });

    // Wire NSFW toggle checkbox
    const nsfwCheckbox = document.getElementById('nsfw-checkbox');
    if (nsfwCheckbox) {
      nsfwCheckbox.addEventListener('change', () => {
        const activeFilter = GalleryFilter.getActiveFilter ? GalleryFilter.getActiveFilter() : 'all';
        if (nsfwCheckbox.checked) {
          AgeGate.verify(
            // On accept:
            () => {
              GalleryRenderer.resetLimit();
              GalleryRenderer.render(_artworks, activeFilter);
              _updateLightboxArtworks(activeFilter);
            },
            // On reject:
            () => {
              nsfwCheckbox.checked = false;
            }
          );
        } else {
          GalleryRenderer.resetLimit();
          GalleryRenderer.render(_artworks, activeFilter);
          _updateLightboxArtworks(activeFilter);
        }
      });
    }

    _translateUI();

    EventBus.on('language.changed', () => {
      GalleryRenderer.resetLimit();
      const activeFilter = GalleryFilter.getActiveFilter ? GalleryFilter.getActiveFilter() : 'all';
      GalleryFilter.setArtworks(_artworks);
      GalleryRenderer.render(_artworks, activeFilter);
      _updateLightboxArtworks(activeFilter);
      _translateUI();
    });
  }

  function _translateUI() {
    const portfolioLabel = document.querySelector('#gallery .section-label');
    if (portfolioLabel) portfolioLabel.textContent = I18n.t('section_portfolio');

    const portfolioTitle = document.querySelector('#gallery .section-title');
    if (portfolioTitle) portfolioTitle.textContent = I18n.t('section_selected_works');

    const loadMoreBtn = document.getElementById('gallery-load-more');
    if (loadMoreBtn) loadMoreBtn.textContent = I18n.t('load_more');

    const nsfwText = document.querySelector('.nsfw-text');
    if (nsfwText) nsfwText.textContent = I18n.t('show_nsfw');
  }

  function _updateLightboxArtworks(category) {
    const showNsfwCheckbox = document.getElementById('nsfw-checkbox');
    const showNsfw = showNsfwCheckbox ? showNsfwCheckbox.checked : false;

    const filterKey = typeof category === 'object' ? (category.en || 'all') : category;
    let filtered = (filterKey === 'all')
      ? _artworks
      : _artworks.filter((a) => {
          const catStr = typeof a.category === 'object' ? (a.category.en || '') : a.category;
          return catStr.toLowerCase() === filterKey.toLowerCase();
        });

    if (!showNsfw) {
      filtered = filtered.filter((a) => !a.nsfw);
    }
    Lightbox.setArtworks(filtered);
  }


  function update(config) {
    _artworks = validateArtworks(config.artworks);
    GalleryRenderer.resetLimit();
    GalleryFilter.setArtworks(_artworks);
    const activeFilter = GalleryFilter.getActiveFilter ? GalleryFilter.getActiveFilter() : 'all';
    _updateLightboxArtworks(activeFilter);
    GalleryRenderer.render(_artworks, activeFilter);
  }

  return Object.freeze({ init, update });
})();
