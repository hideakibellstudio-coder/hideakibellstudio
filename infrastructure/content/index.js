/**
 * ContentLoader — Loads publishable content from /content/*.json.
 * ARCcC: infrastructure/content/index.js
 *
 * Why: GitHub Pages is static, so the "database" of this site is a set
 * of JSON files committed to the repository. The Creator Studio edits
 * these values locally (localStorage override) and publishes them back
 * to the repository (download + commit, or GitHub API).
 *
 * Precedence (highest first):
 *   1. localStorage override  → `hb_content_<key>` (owner's local edits / preview)
 *   2. /content/<key>.json    → published content (this is what visitors see)
 *   3. built-in defaults      → inline fallback (works offline and on file://)
 *
 * Contract: every source has a `key` and a `path`. `get(key)` is synchronous
 * (reads from cache), so modules can consume content without being async.
 */

const ContentLoader = (() => {

  const SOURCES = Object.freeze([
    { key: 'site',   path: 'content/site.json',   fallback: 'config' },
    { key: 'art',    path: 'content/art.json',    fallback: 'artworks' },
    { key: 'studio', path: 'content/studio.json', fallback: 'studio' },
  ]);

  const OVERRIDE_PREFIX = 'hb_content_';

  /** @type {Object<string, *>} in-memory cache of resolved content */
  const _cache = {};

  // ── Public API ──────────────────────────────────────────────

  /**
   * Load every source. Never rejects: missing/unreachable files fall back.
   * @returns {Promise<Object<string, *>>} resolved content map
   */
  async function loadAll() {
    await Promise.all(SOURCES.map(_loadOne));
    return getAll();
  }

  /**
   * Synchronous accessor for one content source.
   * @param {string} key
   * @returns {*}
   */
  function get(key) {
    if (key in _cache) return _cache[key];
    const override = _readOverride(key);
    if (override) { _cache[key] = override; return override; }
    return _builtinFallback(_fallbackKeyFor(key));
  }

  /** @returns {Object<string, *>} all resolved sources */
  function getAll() {
    const out = {};
    SOURCES.forEach(({ key }) => { out[key] = get(key); });
    return out;
  }

  /**
   * True when the given source is currently served from localStorage
   * (i.e. the owner has unpublished local edits).
   * @param {string} key
   * @returns {boolean}
   */
  function hasOverride(key) {
    return !!_readOverride(key);
  }

  /** @returns {string[]} keys that currently have a local override */
  function overrideKeys() {
    return SOURCES.filter(({ key }) => hasOverride(key)).map(({ key }) => key);
  }

  /**
   * Store a local override (preview). Does not touch the repository.
   * @param {string} key
   * @param {*} value
   */
  function setOverride(key, value) {
    _cache[key] = value;
    try {
      localStorage.setItem(OVERRIDE_PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[ContentLoader] Could not persist override for "${key}":`, err);
    }
    EventBus.emit('content.updated', { key, value });
  }

  /**
   * Drop the local override so the published file (or fallback) is used again.
   * @param {string} key
   */
  function clearOverride(key) {
    localStorage.removeItem(OVERRIDE_PREFIX + key);
    delete _cache[key];
    EventBus.emit('content.updated', { key, value: get(key) });
  }

  /**
   * Download a content source as a JSON file (to be committed into /content).
   * @param {string} key
   */
  function exportJSON(key) {
    const value = get(key);
    if (!value) return;

    const body = toJSONString(key);
    const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${key}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Serialized JSON of one source, ready to be committed (also used by the
   * GitHub API publisher).
   * @param {string} key
   * @returns {string}
   */
  function toJSONString(key) {
    return serialize(get(key));
  }

  /**
   * Serialize any content object into the exact JSON text we commit.
   * @param {*} value
   * @returns {string}
   */
  function serialize(value) {
    return JSON.stringify(_stripInternalKeys(value), null, 2) + '\n';
  }

  /**
   * Repository path of a source key.
   * @param {string} key
   * @returns {string}
   */
  function pathFor(key) {
    return SOURCES.find((s) => s.key === key)?.path || `content/${key}.json`;
  }

  /** @returns {Object<string,string>} map of key → repository path */
  function paths() {
    const out = {};
    SOURCES.forEach(({ key, path }) => { out[key] = path; });
    return out;
  }

  // ── Private ─────────────────────────────────────────────────

  async function _loadOne({ key, path, fallback }) {
    // 1. Local override wins (owner previewing unpublished edits)
    const override = _readOverride(key);
    if (override) {
      _cache[key] = override;
      return;
    }

    // 2. Published JSON file
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (res.ok) {
        _cache[key] = await res.json();
        return;
      }
      console.warn(`[ContentLoader] "${path}" not found (${res.status}).`);
    } catch (err) {
      // file:// or offline — fall through to the built-in default
      console.warn(`[ContentLoader] "${path}" unavailable, using built-in defaults.`);
    }

    // 3. Built-in default
    _cache[key] = _builtinFallback(fallback);
  }

  function _fallbackKeyFor(key) {
    return SOURCES.find((s) => s.key === key)?.fallback || key;
  }

  /**
   * Built-in fallback for a source, taken from the module that owns that
   * shape (config defaults, studio contract defaults).
   * @param {string} fallbackKey
   * @returns {*}
   */
  function _builtinFallback(fallbackKey) {
    if (fallbackKey === 'config' && typeof DEFAULT_CONFIG !== 'undefined') {
      return {
        site:    _clone(DEFAULT_CONFIG.site),
        artist:  _clone(DEFAULT_CONFIG.artist),
        social:  _clone(DEFAULT_CONFIG.social),
        contact: _clone(DEFAULT_CONFIG.contact),
        seo:     _clone(DEFAULT_CONFIG.seo),
      };
    }
    if (fallbackKey === 'artworks' && typeof DEFAULT_CONFIG !== 'undefined') {
      return { artworks: _clone(DEFAULT_CONFIG.artworks) };
    }
    if (fallbackKey === 'studio' && typeof DEFAULT_STUDIO_CONTENT !== 'undefined') {
      return _clone(DEFAULT_STUDIO_CONTENT);
    }
    return null;
  }

  function _readOverride(key) {
    try {
      const raw = localStorage.getItem(OVERRIDE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Remove helper keys (`_comment`) so exported JSON stays clean. */
  function _stripInternalKeys(value) {
    if (Array.isArray(value)) return value.map(_stripInternalKeys);
    if (value && typeof value === 'object') {
      const out = {};
      Object.keys(value).forEach((k) => {
        if (k.startsWith('_')) return;
        out[k] = _stripInternalKeys(value[k]);
      });
      return out;
    }
    return value;
  }

  function _clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  return Object.freeze({
    loadAll, get, getAll,
    hasOverride, overrideKeys, setOverride, clearOverride,
    exportJSON, toJSONString, serialize, pathFor, paths,
    SOURCES,
  });
})();
