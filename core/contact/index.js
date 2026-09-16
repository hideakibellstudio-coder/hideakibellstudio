/**
 * Contact Module — Public API.
 * ARCcC: core/contact/index.js
 */

const ContactModule = (() => {

  let _config = null;

  function init(config) {
    _config = config;
    SocialLinksRenderer.render(config.social);
    _renderEmail(config.contact.email);
    _translateUI();

    EventBus.on('language.changed', () => {
      SocialLinksRenderer.render(_config.social);
      _renderEmail(_config.contact.email);
      _translateUI();
    });
  }

  function update(config) {
    _config = config;
    SocialLinksRenderer.render(config.social);
    _renderEmail(config.contact.email);
    _translateUI();
  }

  function _renderEmail(email) {
    const el = document.getElementById('contact-email');
    // Basic format validation — email comes from published content JSON.
    if (el && email && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(String(email))) {
      el.href        = `mailto:${email}`;
      el.textContent = email;
    }
  }

  function _translateUI() {
    // Labels & Titles
    const label = document.querySelector('#contact .section-label');
    if (label) label.textContent = I18n.t('section_contact');

    const title = document.querySelector('#contact .section-title');
    if (title) title.textContent = I18n.t('section_lets_create');

    const intro = document.querySelector('.contact__intro');
    if (intro) intro.textContent = I18n.t('contact_intro');

    const socialDivider = document.getElementById('contact-divider');
    if (socialDivider) socialDivider.textContent = I18n.t('contact_or_send');

    const cardText = document.getElementById('contact-card-text');
    if (cardText) cardText.textContent = I18n.t('contact_card_text');
  }

  return Object.freeze({ init, update });
})();

