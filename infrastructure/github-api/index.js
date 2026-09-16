/**
 * GitHubApi — Publishes content files back to the repository.
 * ARCcC: infrastructure/github-api/index.js
 *
 * This is the ONLY real write-access path of the static site: with a
 * fine-grained Personal Access Token (Contents: Read and write) the Creator
 * Studio can commit content/*.json straight to the branch, which GitHub
 * Pages then republishes automatically.
 *
 * Security rules for the token:
 *   1. It lives in the owner's browser localStorage, NEVER in the repo.
 *   2. Use a fine-grained PAT limited to this single repository, scope
 *      "Contents: Read and write", with an expiry (e.g. 90 days).
 *   3. Anyone holding the token can rewrite the repository — treat it like a key.
 */

const GitHubApi = (() => {

  const API       = 'https://api.github.com';
  const CFG_KEY   = 'hb_github_publish';
  const TOKEN_KEY = 'hb_github_token';

  // ── Configuration (owner / repo / branch) ───────────────────

  /** @returns {{owner: string, repo: string, branch: string}} */
  function getSettings() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        owner:  parsed.owner  || '',
        repo:   parsed.repo   || '',
        branch: parsed.branch || 'main',
      };
    } catch {
      return { owner: '', repo: '', branch: 'main' };
    }
  }

  /** @param {{owner: string, repo: string, branch: string}} settings */
  function saveSettings(settings) {
    const clean = {
      owner:  String(settings.owner  || '').trim(),
      repo:   String(settings.repo   || '').trim(),
      branch: String(settings.branch || 'main').trim() || 'main',
    };
    localStorage.setItem(CFG_KEY, JSON.stringify(clean));
    return clean;
  }

  /** @returns {boolean} */
  function isConfigured() {
    const s = getSettings();
    return !!(s.owner && s.repo);
  }

  // ── Token ───────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  }

  /** @param {string} token */
  function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, String(token || '').trim());
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /** @returns {boolean} */
  function hasToken() {
    return !!getToken();
  }

  // ── Remote operations ───────────────────────────────────────

  /**
   * Check that the token works and the repository is reachable.
   * @returns {Promise<{ok: boolean, login?: string, error?: string}>}
   */
  async function verify() {
    if (!getToken()) return { ok: false, error: 'NO_TOKEN' };

    const user = await _request('GET', '/user');
    if (!user.ok) return { ok: false, error: user.error };

    const s = getSettings();
    if (s.owner && s.repo) {
      const repo = await _request('GET', `/repos/${s.owner}/${s.repo}`);
      if (!repo.ok) return { ok: false, error: repo.error };
    }

    return { ok: true, login: user.data && user.data.login };
  }

  /**
   * Commit one file, creating or updating it.
   * @param {{path: string, content: string, message: string}} file
   * @returns {Promise<{ok: boolean, error?: string, commit?: string}>}
   */
  async function putFile({ path, content, message }) {
    const s = getSettings();
    if (!s.owner || !s.repo) return { ok: false, error: 'NO_REPO' };

    const existing = await _request(
      'GET',
      `/repos/${s.owner}/${s.repo}/contents/${path}?ref=${encodeURIComponent(s.branch)}`
    );
    const sha = existing.ok && existing.data ? existing.data.sha : undefined;

    const body = {
      message: message || `content: update ${path}`,
      content: _toBase64(content),
      branch:  s.branch,
    };
    if (sha) body.sha = sha;

    const res = await _request('PUT', `/repos/${s.owner}/${s.repo}/contents/${path}`, body);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, commit: res.data && res.data.commit ? res.data.commit.sha : '' };
  }

  /**
   * Commit several files sequentially (the contents API has no batch PUT).
   * @param {Array<{path: string, content: string, message?: string}>} files
   * @param {string} [message]
   * @returns {Promise<{ok: boolean, results: Array<object>}>}
   */
  async function publish(files, message) {
    const results = [];
    let ok = true;

    for (const file of files) {
      const res = await putFile({
        path: file.path,
        content: file.content,
        message: file.message || message,
      });
      results.push(Object.assign({ path: file.path }, res));
      if (!res.ok) ok = false;
    }

    return { ok, results };
  }

  // ── Private ────────────────────────────────────────────────

  async function _request(method, endpoint, body) {
    const token = getToken();
    if (!token) return { ok: false, error: 'NO_TOKEN' };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method,
        headers: {
          'Accept':        'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        const data = res.status === 204 ? null : await res.json().catch(() => null);
        return { ok: true, data };
      }

      const errBody = await res.json().catch(() => null);
      return {
        ok: false,
        error: `${res.status} ${(errBody && errBody.message) || res.statusText}`,
        status: res.status,
      };
    } catch (err) {
      return { ok: false, error: `NETWORK: ${err.message}` };
    }
  }

  /** UTF-8 safe base64 encoding (plain btoa breaks on accents). */
  function _toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  return Object.freeze({
    getSettings, saveSettings, isConfigured,
    getToken, saveToken, clearToken, hasToken,
    verify, putFile, publish,
  });
})();
