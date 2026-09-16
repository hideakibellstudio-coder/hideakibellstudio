/**
 * About Renderer — Populates the about section from config.
 * ARCcC: core/about/private/renderer/index.js
 */

const AboutRenderer = (() => {

  /**
   * Populate about section with artist data.
   * @param {SiteConfig} config
   */
  function render(config) {
    const { artist } = config;

    // Avatar
    const avatar = document.getElementById('about-avatar');
    if (avatar) {
      avatar.src = artist.avatarUrl || 'assets/images/avatar.jpg';
      avatar.alt = `${artist.name} — digital artist`;
    }

    // Bio (array of paragraphs)
    const bioEl = document.getElementById('about-bio');
    const bioParas = I18n.tFieldArray(artist.bio);
    if (bioEl && Array.isArray(bioParas)) {
      bioEl.innerHTML = bioParas
        .map((para) => `<p>${_sanitize(para)}</p>`)
        .join('');
    }

    // Specialties
    const specEl = document.getElementById('about-specialties');
    if (specEl && Array.isArray(artist.specialties)) {
      specEl.innerHTML = artist.specialties
        .map((s) => `<span class="specialty-tag">${_sanitize(I18n.tField(s))}</span>`)
        .join('');
    }

    // Stats
    const stats = artist.stats || {};
    _setStat('about-stat-years',    I18n.tField(stats.years)    || '—');
    _setStat('about-stat-projects', I18n.tField(stats.projects) || '—');
    _setStat('about-stat-clients',  I18n.tField(stats.clients)  || '—');
  }


  function _setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return Object.freeze({ render });
})();
