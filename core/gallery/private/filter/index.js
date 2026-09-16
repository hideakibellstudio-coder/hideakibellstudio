/**
 * Gallery Filter — Builds filter tab buttons and handles active state.
 * ARCcC: core/gallery/private/filter/index.js
 */

const GalleryFilter = (() => {

  const FILTERS_SELECTOR = '#gallery-filters';
  let _artworks    = [];
  let _activeFilter = 'all';

  /**
   * Initialize with artworks array — builds filter tabs.
   * @param {Artwork[]} artworks
   */
  function init(artworks) {
    _artworks = artworks;
    _buildTabs();
  }

  /** Update artworks list (e.g. after config change) */
  function setArtworks(artworks) {
    _artworks = artworks;
    _buildTabs();
    EventBus.emit(EVENTS.GALLERY_FILTER, _activeFilter);
  }

  function _buildTabs() {
    const container = document.querySelector(FILTERS_SELECTOR);
    if (!container) return;

    const categories = ['all', ..._getUniqueCategories()];
    container.innerHTML = '';

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `filter-btn${cat === _activeFilter ? ' is-active' : ''}`;
      btn.textContent = cat === 'all' ? I18n.t('all_works') : I18n.tField(cat);
      btn.setAttribute('id', `filter-${(typeof cat === 'string' ? cat : (cat.en || 'all')).toLowerCase().replace(/\s+/g, '-')}`);
      btn.dataset.filter = typeof cat === 'string' ? cat : (cat.en || 'all');
      btn.addEventListener('click', () => _setFilter(cat));
      container.appendChild(btn);
    });
  }

  function _setFilter(category) {
    _activeFilter = category;
    const catKey = typeof category === 'string' ? category : (category.en || 'all');
    // Update active state
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === catKey);
    });
    EventBus.emit(EVENTS.GALLERY_FILTER, category);
  }


  function _getUniqueCategories() {
    const seen = new Set();
    const unique = [];
    _artworks.forEach((a) => {
      const key = typeof a.category === 'object' ? (a.category.en || '') : a.category;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(a.category);
      }
    });
    return unique;
  }


  function getActiveFilter() {
    return _activeFilter;
  }

  return Object.freeze({ init, setArtworks, getActiveFilter });
})();
