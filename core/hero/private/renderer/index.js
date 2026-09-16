/**
 * Hero Renderer — Populates hero section DOM from config.
 * ARCcC: core/hero/private/renderer/index.js
 */

const HeroRenderer = (() => {

  /**
   * Populate the hero section with artist data.
   * @param {SiteConfig} config
   */
  function render(config) {
    const { artist } = config;

    // Name: split into first + last for italic accent styling
    const nameParts = artist.name.trim().split(' ');
    const firstName = nameParts.slice(0, -1).join(' ');
    const lastName  = nameParts.slice(-1)[0] || '';

    const nameEl = document.getElementById('hero-name');
    if (nameEl) {
      nameEl.innerHTML = firstName
        ? `${_sanitize(firstName)} <span>${_sanitize(lastName)}</span>`
        : `<span>${_sanitize(artist.name)}</span>`;
    }

    // Eyebrow label (specialties[0])
    const eyebrowEl = document.getElementById('hero-eyebrow');
    if (eyebrowEl && artist.specialties?.length > 0) {
      const translatedSpecs = artist.specialties.slice(0, 3).map(s => I18n.tField(s));
      eyebrowEl.textContent = translatedSpecs.join('  ·  ');
    }
  }

  function _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return Object.freeze({ render });
})();
