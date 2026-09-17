/**
 * Publisher — Publishes content to GitHub Pages, or exports it manually.
 * ARCcC: core/settings-panel/private/publisher/index.js
 *
 * Three ways to make edits go live, from safest to most convenient:
 *   1. "Save" only                   → localStorage (preview, nothing public)
 *   2. "Export JSON files"           → download content/*.json, commit by hand
 *   3. "Publish to GitHub"           → commit via the GitHub API using a
 *                                      fine-grained token (never committed)
 *
 * The token grants write access to the repository, so it lives only in this
 * browser's localStorage and can be forgotten with one click.
 */

const Publisher = (() => {

  const KEYS = ['site', 'art', 'studio'];

  /** @type {function(): Object<string,*>} returns the pending content */
  let _collect = () => ({});

  /**
   * @param {{collect: function(): Object<string,*>}} options
   */
  function init(options) {
    if (options && typeof options.collect === 'function') _collect = options.collect;

    _fillSettings();
    _bind();
    refreshStatus();
  }

  // ── Status ────────────────────────────────────────────────

  /** Refresh the local-override and GitHub pills. */
  function refreshStatus() {
    const isEn = I18n.getLang() === 'en';

    KEYS.forEach((key) => {
      const el = document.querySelector(`[data-override-status="${key}"]`);
      if (!el) return;
      const pending = ContentLoader.hasOverride(key);
      el.textContent = pending
        ? (isEn ? 'local edits pending' : 'edição local pendente')
        : (isEn ? 'from repository' : 'vindo do repositório');
      el.classList.toggle('is-warn', pending);
      el.classList.toggle('is-ok', !pending);
    });

    const gh = document.getElementById('pub-status');
    if (gh) {
      const configured = GitHubApi.isConfigured();
      const token = GitHubApi.hasToken();
      gh.textContent = !configured
        ? (isEn ? 'repository not set' : 'repositório não definido')
        : token
          ? (isEn ? 'token stored in this browser' : 'token guardado neste navegador')
          : (isEn ? 'no token' : 'sem token');
      gh.classList.toggle('is-ok', configured && token);
      gh.classList.toggle('is-warn', !configured || !token);
    }
  }

  // ── Settings form ──────────────────────────────────────────

  function _fillSettings() {
    const s = GitHubApi.getSettings();
    _setValue('pub-owner',  s.owner);
    _setValue('pub-repo',   s.repo);
    _setValue('pub-branch', s.branch);

    const tokenField = document.getElementById('pub-token');
    if (tokenField) {
      tokenField.value = '';
      tokenField.placeholder = GitHubApi.hasToken()
        ? '••••••••  (token saved)'
        : 'github_pat_...';
    }
  }

  function _bind() {
    const isEn = () => I18n.getLang() === 'en';

    document.getElementById('pub-save-settings')?.addEventListener('click', () => {
      GitHubApi.saveSettings({
        owner:  _value('pub-owner'),
        repo:   _value('pub-repo'),
        branch: _value('pub-branch'),
      });
      const token = _value('pub-token');
      if (token) GitHubApi.saveToken(token);

      _fillSettings();
      refreshStatus();
      _log(isEn() ? 'Repository settings saved in this browser.' : 'Configurações do repositório salvas neste navegador.');
    });

    document.getElementById('pub-verify')?.addEventListener('click', async () => {
      const token = _value('pub-token');
      if (token) GitHubApi.saveToken(token);

      _log(isEn() ? 'Checking token…' : 'Verificando token…');
      const res = await GitHubApi.verify();
      _log(res.ok
        ? (isEn() ? `✔ Token OK (user: ${res.login}).` : `✔ Token OK (usuário: ${res.login}).`)
        : `✖ ${_explain(res.error, isEn())}`);
      refreshStatus();
    });

    document.getElementById('pub-forget-token')?.addEventListener('click', () => {
      GitHubApi.clearToken();
      _fillSettings();
      refreshStatus();
      _log(isEn() ? 'Token removed from this browser.' : 'Token removido deste navegador.');
    });

    document.getElementById('pub-export-all')?.addEventListener('click', () => _exportAll());

    document.getElementById('pub-publish')?.addEventListener('click', () => _publish());

    document.querySelectorAll('[data-discard]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-discard');
        ContentLoader.clearOverride(key);
        refreshStatus();
        _log(isEn()
          ? `Local edits for "${key}" discarded — reloading published content.`
          : `Edições locais de "${key}" descartadas — recarregando o conteúdo publicado.`);
      });
    });
  }

  // ── Export (no token required) ────────────────────────────

  function _exportAll() {
    const isEn = I18n.getLang() === 'en';
    const data = _collect();

    KEYS.forEach((key, index) => {
      // Small stagger so browsers do not swallow sequential downloads
      setTimeout(() => _download(`${key}.json`, ContentLoader.serialize(data[key])), index * 250);
    });

    _log(isEn()
      ? 'Downloading site.json, art.json and studio.json — drop them into the /content folder and commit.'
      : 'Baixando site.json, art.json e studio.json — coloque-os na pasta /content e faça o commit.');
  }

  function _download(filename, text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Publish (GitHub API) ──────────────────────────────────

  async function _publish() {
    const isEn = I18n.getLang() === 'en';

    try {
      await _publishInner(isEn);
    } catch (err) {
      // Never fail silently: surface the real reason in the publish log.
      _log(`✖ ${isEn ? 'Unexpected error' : 'Erro inesperado'}: ${err && err.message ? err.message : err}`);
      console.error('[Publisher] publish failed:', err);
    }
  }

  async function _publishInner(isEn) {
    if (!GitHubApi.isConfigured()) {
      _log(isEn() ? '✖ Fill owner and repository first.' : ' Preencha owner e repositório primeiro.');
      return;
    }
    if (!GitHubApi.hasToken()) {
      _log(isEn() ? '✖ No token stored — add one above.' : '✖ Nenhum token guardado — adicione um acima.');
      return;
    }

    const data = _collect();
    const files = KEYS.map((key) => ({
      path:    ContentLoader.pathFor(key),
      content: ContentLoader.serialize(data[key]),
    }));

    // ── Blue team: pre-publish content scan ──────────────────
    // Secrets (tokens/private keys) BLOCK the publish; other findings
    // (injection patterns, pollution keys) are surfaced as warnings.
    if (typeof ContentGuard !== 'undefined') {
      const SECRET = /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY/i;
      let secretHit = false;
      KEYS.forEach((key) => {
        const report = ContentGuard.audit(data[key], ContentLoader.pathFor(key));
        _log(ContentGuard.summarize(report));
        if (!report.clean) {
          report.findings.forEach((f) => {
            if (SECRET.test(f.sample) || /prototype-pollution/.test(f.kind)) secretHit = true;
          });
        }
      });
      if (secretHit) {
        _log(isEn()
          ? '✖ Publish BLOCKED: a secret (token/private key) or pollution key was detected in the content. Remove it from the JSON and try again.'
          : '✖ Publicação BLOQUEADA: um segredo (token/chave privada) ou chave de poluição foi detectado no conteúdo. Remova-o do JSON e tente de novo.');
        return;
      }
    }

    _log(isEn() ? 'Publishing…' : 'Publicando…');

    const res = await GitHubApi.publish(
      files,
      `content: update ${KEYS.join(', ')} (Creator Studio)`
    );

    res.results.forEach((r) => {
      _log(`${r.ok ? '✔' : '✖'} ${r.path}${r.ok ? '' : ` — ${_explain(r.error, isEn())}`}`);
    });

    if (res.ok) {
      // The repository is now the source of truth for these keys.
      KEYS.forEach((key) => ContentLoader.clearOverride(key));
      _log(isEn()
        ? '✔ Published. GitHub Pages rebuilds in ~1 minute.'
        : '✔ Publicado. O GitHub Pages republica em ~1 minuto.');
    }

    refreshStatus();
  }

  // ── Helpers ───────────────────────────────────────────────

  function _explain(error, isEn) {
    const map = {
      NO_TOKEN: isEn ? 'no token stored' : 'nenhum token guardado',
      NO_REPO:  isEn ? 'owner/repository not configured' : 'owner/repositório não configurado',
      '401':    isEn ? '401 Unauthorized — token invalid or expired' : '401 Não autorizado — token inválido ou expirado',
      '403':    isEn ? '403 Forbidden — token lacks "Contents: write"' : '403 Proibido — token sem "Contents: write"',
      '404':    isEn ? '404 Not found — check owner, repository and branch' : '404 Não encontrado — verifique owner, repositório e branch',
      '409':    isEn ? '409 Conflict — file changed remotely, try again' : '409 Conflito — o arquivo mudou remotamente, tente de novo',
      '422':    isEn ? '422 Unprocessable — check the branch name' : '422 Não processável — verifique o nome da branch',
    };
    if (!error) return isEn ? 'unknown error' : 'erro desconhecido';
    const status = String(error).slice(0, 3);
    return map[error] || map[status] || error;
  }

  function _log(line) {
    const el = document.getElementById('pub-log');
    if (!el) return;
    const time = new Date().toLocaleTimeString();
    el.textContent += `[${time}] ${line}\n`;
    el.scrollTop = el.scrollHeight;
  }

  function _value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function _setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  return Object.freeze({ init, refreshStatus });
})();