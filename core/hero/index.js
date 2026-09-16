/**
 * Hero Module — Public API.
 * ARCcC: core/hero/index.js
 */

const HeroModule = (() => {

  let _config = null;

  /**
   * Initialize hero section.
   * @param {SiteConfig} config
   */
  function init(config) {
    _config = config;
    HeroRenderer.render(config);
    HeroAnimator.init([I18n.tField(config.artist.tagline)]);
    _translateUI();

    EventBus.on('language.changed', () => {
      HeroRenderer.render(_config);
      HeroAnimator.updateTaglines([I18n.tField(_config.artist.tagline)]);
      _translateUI();
    });
  }

  /**
   * Update hero when config changes.
   * @param {SiteConfig} config
   */
  function update(config) {
    _config = config;
    HeroRenderer.render(config);
    HeroAnimator.updateTaglines([I18n.tField(config.artist.tagline)]);
    _translateUI();
  }

  function _translateUI() {
    const ctaGallery = document.getElementById('hero-cta-gallery');
    if (ctaGallery) {
      ctaGallery.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        ${I18n.t('hero_view_gallery')}
      `;
    }
    const ctaContact = document.getElementById('hero-cta-contact');
    if (ctaContact) ctaContact.textContent = I18n.t('hero_get_in_touch');

    // Hub layout: second CTA points to the Software area
    const ctaStudio = document.getElementById('hero-cta-studio');
    if (ctaStudio) ctaStudio.textContent = I18n.t('hub_studio_cta');

    const scrollLabel = document.querySelector('.hero__scroll-label');
    if (scrollLabel) scrollLabel.textContent = I18n.t('hero_scroll');
  }

  return Object.freeze({ init, update });
})();

