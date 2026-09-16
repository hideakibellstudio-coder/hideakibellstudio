/**
 * Gate UI — Passphrase overlay for the Creator Studio.
 * ARCcC: core/settings-panel/private/gate-ui/index.js
 *
 * Renders the first-run ("create passphrase") and subsequent ("unlock")
 * states of #gate-overlay and hands control back to the dashboard once the
 * session is unlocked. The hashing itself lives in core/admin-gate.
 *
 * IMPORTANT: this is a local convenience lock, not server-side auth.
 * See README → "Creator Studio: segurança" for the full model.
 */

const GateUI = (() => {

  let _onUnlocked = null;

  /**
   * @param {Function} onUnlocked — called when the dashboard may be shown
   */
  function init(onUnlocked) {
    _onUnlocked = onUnlocked;

    const overlay = document.getElementById('gate-overlay');
    if (!overlay) { _unlocked(); return; }

    // Already unlocked in this session
    if (AdminGate.isUnlocked()) { _unlocked(); return; }

    // First run on the owner's own machine: no passphrase defined yet AND we
    // are on a local host, so open straight away. Nothing public is affected:
    // publishing still requires the GitHub token.
    if (EnvUtils.isLocalHost() && !AdminGate.isConfigured()) { _unlocked(); return; }

    document.body.classList.add('is-locked');
    _render();
    _bind(overlay);
    document.getElementById('gate-pass')?.focus();
  }

  // ── Rendering ──────────────────────────────────────────────

  function _render() {
    const isSetup = !AdminGate.isConfigured();
    const isEn    = I18n.getLang() === 'en';

    _set('gate-title', isSetup
      ? (isEn ? 'Create your passphrase' : 'Crie sua senha')
      : (isEn ? 'Creator Studio is locked' : 'O Creator Studio está bloqueado'));

    _set('gate-desc', isSetup
      ? (isEn
          ? 'This passphrase stays in this browser only (stored as a hash) and is never committed to the repository. It keeps the studio away from curious eyes — the real protection is your GitHub token.'
          : 'Esta senha fica somente neste navegador (armazenada como hash) e nunca é enviada ao repositório. Ela afasta curiosos — a proteção real é o seu token do GitHub.')
      : (isEn
          ? 'Enter the passphrase to open the studio in this session.'
          : 'Digite a senha para abrir o estúdio nesta sessão.'));

    const confirmField = document.getElementById('gate-confirm-field');
    if (confirmField) confirmField.hidden = !isSetup;

    _set('gate-submit', isSetup
      ? (isEn ? 'Create passphrase' : 'Criar senha')
      : (isEn ? 'Unlock' : 'Desbloquear'));

    const forgot = document.getElementById('gate-forgot');
    if (forgot) forgot.hidden = isSetup;
  }

  function _set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Events ──────────────────────────────────────────────────

  function _bind(overlay) {
    overlay.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await _submit();
    });

    document.getElementById('gate-forgot')?.addEventListener('click', (e) => {
      e.preventDefault();
      const isEn = I18n.getLang() === 'en';
      const msg = isEn
        ? 'Forget the current passphrase and create a new one?'
        : 'Esquecer a senha atual e criar uma nova?';
      if (!window.confirm(msg)) return;
      AdminGate.reset();
      _error(isEn ? 'Passphrase cleared. Create a new one.' : 'Senha apagada. Crie uma nova.');
      _render();
      document.getElementById('gate-pass').value = '';
      document.getElementById('gate-confirm').value = '';
    });
  }

  async function _submit() {
    const isEn  = I18n.getLang() === 'en';
    const pass  = document.getElementById('gate-pass').value;
    const again = document.getElementById('gate-confirm').value;
    const isSetup = !AdminGate.isConfigured();

    _error('');

    if (isSetup) {
      if (!pass || pass.length < 4) {
        _error(isEn ? 'Use at least 4 characters.' : 'Use pelo menos 4 caracteres.');
        return;
      }
      if (pass !== again) {
        _error(isEn ? 'The two passphrases do not match.' : 'As duas senhas não coincidem.');
        return;
      }
      const created = await AdminGate.setPassphrase(pass);
      if (!created) { _error(isEn ? 'Could not save the passphrase.' : 'Não foi possível salvar a senha.'); return; }
      _unlocked();
      return;
    }

    const ok = await AdminGate.unlock(pass);
    if (!ok) {
      _error(isEn ? 'Wrong passphrase.' : 'Senha incorreta.');
      document.getElementById('gate-pass').value = '';
      return;
    }
    _unlocked();
  }

  function _error(text) {
    const el = document.getElementById('gate-error');
    if (el) el.textContent = text;
  }

  function _unlocked() {
    document.body.classList.remove('is-locked');
    const overlay = document.getElementById('gate-overlay');
    if (overlay) overlay.hidden = true;
    if (typeof _onUnlocked === 'function') _onUnlocked();
  }

  return Object.freeze({ init });
})();