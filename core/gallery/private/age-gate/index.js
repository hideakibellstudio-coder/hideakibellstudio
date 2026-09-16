/**
 * Age Gate — 18+ verification modal.
 * ARCcC: core/gallery/private/age-gate/index.js
 */
const AgeGate = (() => {
  let _modal = null;
  let _onAcceptCallback = null;

  function init() {
    _buildModal();
    EventBus.on('language.changed', _translateUI);
  }

  /**
   * Verify age before proceeding.
   * If already verified, calls callback immediately. Otherwise shows modal.
   * @param {Function} onAccept
   */
  function verify(onAccept) {
    if (localStorage.getItem('hb_age_verified') === 'true') {
      if (onAccept) onAccept();
      return;
    }
    _onAcceptCallback = onAccept;
    _modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function _buildModal() {
    // Check if already in DOM
    if (document.querySelector('.age-gate-overlay')) return;

    _modal = document.createElement('div');
    _modal.className = 'age-gate-overlay';
    _modal.setAttribute('role', 'dialog');
    _modal.setAttribute('aria-modal', 'true');
    _modal.setAttribute('aria-label', 'Age verification warning');
    _modal.innerHTML = `
      <div class="age-gate-container">
        <div class="age-gate-icon" aria-hidden="true">✦</div>
        <h2 class="age-gate-title"></h2>
        <p class="age-gate-desc"></p>
        <div class="age-gate-actions">
          <button class="btn-primary age-gate-btn--accept" id="age-accept-btn"></button>
          <button class="btn-secondary age-gate-btn--reject" id="age-reject-btn"></button>
        </div>
      </div>
    `;

    document.body.appendChild(_modal);
    _translateUI();

    _modal.querySelector('.age-gate-btn--accept').addEventListener('click', () => {
      localStorage.setItem('hb_age_verified', 'true');
      _modal.classList.remove('is-open');
      document.body.style.overflow = '';
      if (_onAcceptCallback) _onAcceptCallback();
      // Notify all modules that age is verified
      EventBus.emit('age.verified');
    });

    _modal.querySelector('.age-gate-btn--reject').addEventListener('click', () => {
      _modal.classList.remove('is-open');
      document.body.style.overflow = '';
      _onAcceptCallback = null;
    });
  }

  function _translateUI() {
    if (!_modal) return;
    const title = _modal.querySelector('.age-gate-title');
    if (title) title.textContent = I18n.t('age_gate_title');

    const desc = _modal.querySelector('.age-gate-desc');
    if (desc) desc.textContent = I18n.t('age_gate_desc');

    const accept = _modal.querySelector('.age-gate-btn--accept');
    if (accept) accept.textContent = I18n.t('age_gate_accept');

    const reject = _modal.querySelector('.age-gate-btn--reject');
    if (reject) reject.textContent = I18n.t('age_gate_reject');
  }

  return Object.freeze({ init, verify });
})();

