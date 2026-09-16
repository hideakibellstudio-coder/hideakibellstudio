/**
 * Content Guard — Runtime detection layer (blue team).
 * ARCcC: core/settings-panel/private/content-guard/index.js
 *
 * Scans every JSON payload that enters the app (published /content files,
 * localStorage overrides, imported files) for active-content patterns that
 * must never reach a renderer:
 *
 *   - HTML/script injection attempts  (<script, <iframe, on*= handlers, <img/svg onload…)
 *   - javascript:/data:text/html URI schemes
 *   - prototype pollution keys        (__proto__, constructor, prototype)
 *   - accidental secrets pasted into content (GitHub tokens, private keys)
 *
 * Findings are recorded locally (last 100, capped) and surfaced in the
 * Creator Studio publish pane, so the author can inspect and clean the
 * source JSON before publishing. Detection only — never mutates content.
 */

const ContentGuard = (() => {

  const LOG_KEY = 'hb_guard_log';
  const MAX_LOG = 100;

  /** Single regex, anchored to dangerous shapes (low false-positive design). */
  const PATTERN = new RegExp([
    '<\\s*(script|iframe|object|embed|link|meta)\\b',   // active HTML elements
    '<\\s*(img|svg|body|video|audio|input)\\b[^>]*\\son\\w+\\s*=', // event handlers on tags
    '\\son(?:error|load|click|mouseover|focus)\\s*=',  // bare inline handlers
    '(?:href|src|action)\\s*=\\s*["\']?\\s*javascript:', // javascript: URIs
    'data:\\s*text\\s*/\\s*html',                      // data:text/html payloads
    '"__proto__"\\s*:',                                // prototype pollution in raw JSON
    '(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}',     // GitHub PAT shapes (classic + fine-grained)
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',              // private keys
  ].join('|'), 'i');

  /** Keys whose values are expected to hold URLs — scheme-checked. */
  const URL_KEYS = /url|href|link|image|avatar/i;

  let _lastReport = null;

  function init() {
    _hookJsonParse();
  }

  /**
   * Audit a parsed JSON object. Returns a report:
   * { clean: boolean, findings: Array<{path, kind, sample}> }
   * @param {*} data
   * @param {string} [label] — source label for the log ("content/art.json"…)
   */
  function audit(data, label = 'unknown') {
    const findings = [];
    _walk(data, '', (path, value) => {
      if (typeof value === 'string') {
        const m = value.match(PATTERN);
        if (m) {
          findings.push({ path: path || '(root)', kind: 'active-content', sample: value.slice(0, 60) });
        } else if (URL_KEYS.test(path) && /^\s*(javascript|vbscript|data:text\s*\/html)/i.test(value)) {
          findings.push({ path: path || '(root)', kind: 'dangerous-scheme', sample: value.slice(0, 60) });
        }
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        ['__proto__', 'constructor', 'prototype'].forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            findings.push({ path: `${path}.${k}`, kind: 'prototype-pollution', sample: '[key]' });
          }
        });
      }
    });

    const report = {
      at: new Date().toISOString(),
      source: label,
      clean: findings.length === 0,
      findings: findings.slice(0, 20),
    };
    _lastReport = report;
    if (!report.clean) _record(report);
    return report;
  }

  /** Scan a raw JSON string (parses internally; returns null if unparseable). */
  function auditRaw(text, label) {
    try {
      return audit(JSON.parse(text), label);
    } catch (e) {
      return { at: new Date().toISOString(), source: label || 'raw', clean: false, findings: [{ path: '(parse)', kind: 'invalid-json', sample: String(e.message).slice(0, 60) }] };
    }
  }

  /** Report of the last audit performed. */
  function lastReport() {
    return _lastReport;
  }

  /** Render a human-readable summary line for the publish log. */
  function summarize(report) {
    if (!report) return '';
    if (report.clean) return `✔ ${report.source}: sem padrões suspeitos`;
    const kinds = report.findings.map((f) => f.kind).join(', ');
    return `⚠ ${report.source}: ${report.findings.length} ocorrência(s) [${kinds}] em ${report.findings.map((f) => f.path).slice(0, 3).join(', ')}`;
  }

  /** Last 100 recorded findings (localStorage-backed). */
  function getLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function clearLog() {
    try { localStorage.removeItem(LOG_KEY); } catch { /* noop */ }
  }

  // ── Internals ───────────────────────────────────────────────

  function _walk(node, path, visit) {
    if (Array.isArray(node)) {
      node.forEach((v, i) => _walk(v, `${path}[${i}]`, visit));
      return;
    }
    if (node && typeof node === 'object') {
      visit(path, node);
      Object.keys(node).forEach((k) => _walk(node[k], path ? `${path}.${k}` : k, visit));
      return;
    }
    visit(path, node);
  }

  function _record(report) {
    try {
      const log = getLog();
      log.unshift({ at: report.at, source: report.source, findings: report.findings });
      localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG)));
    } catch { /* storage unavailable — detection still returns in-memory */ }
  }

  /** Wrap JSON.parse so every inbound payload is audited automatically. */
  function _hookJsonParse() {
    if (JSON.parse.__guarded) return;
    const original = JSON.parse.bind(JSON);
    const guarded = function (text, reviver) {
      const value = original(text, reviver);
      // Audit only JSON objects/arrays (skip tiny primitives for speed).
      if (value && typeof value === 'object' && typeof text === 'string' && text.length > 40) {
        try { audit(value, 'json.parse'); } catch { /* never break parsing */ }
      }
      return value;
    };
    guarded.__guarded = true;
    JSON.parse = guarded;
  }

  return Object.freeze({
    init, audit, auditRaw, lastReport, summarize, getLog, clearLog,
  });
})();