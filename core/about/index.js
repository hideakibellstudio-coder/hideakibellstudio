/**
 * About Module — Public API.
 * ARCcC: core/about/index.js
 */

const AboutModule = (() => {

  let _config = null;

  function init(config) {
    _config = config;
    AboutRenderer.render(config);
    _translateUI();

    EventBus.on('language.changed', () => {
      AboutRenderer.render(_config);
      _translateUI();
    });
  }

  function update(config) {
    _config = config;
    AboutRenderer.render(config);
    _translateUI();
  }

  function _translateUI() {
    const label = document.querySelector('#about .section-label');
    if (label) label.textContent = I18n.t('section_about');

    const title = document.querySelector('#about .section-title');
    if (title) title.textContent = I18n.t('section_the_artist');
  }

  return Object.freeze({ init, update });
})();

