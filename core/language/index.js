/**
 * LanguageModule — Handles language switching UI interactions.
 * ARCcC: core/language/index.js
 */
const LanguageModule = (() => {

  function init(_config) {
    _updateButton();
    _bindEvents();
  }


  function _bindEvents() {
    const btn = document.getElementById('lang-switch-btn');
    btn?.addEventListener('click', () => {
      const nextLang = I18n.getLang() === I18n.LANGUAGES.EN ? I18n.LANGUAGES.PT : I18n.LANGUAGES.EN;
      I18n.setLang(nextLang);
      _updateButton();
    });
  }

  function _updateButton() {
    const btn = document.getElementById('lang-switch-btn');
    if (btn) {
      const current = I18n.getLang();
      btn.textContent = current.toUpperCase();
      btn.setAttribute(
        'aria-label',
        current === I18n.LANGUAGES.EN ? 'Switch to Portuguese' : 'Mudar para Inglês'
      );
      btn.setAttribute(
        'title',
        current === I18n.LANGUAGES.EN ? 'Portuguese' : 'Inglês'
      );
    }
  }

  function update() {
    _updateButton();
  }

  return Object.freeze({ init, update });
})();
