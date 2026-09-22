/**
 * Local validation script (not part of the site).
 * Run: node tools/validate.js
 *
 * Checks:
 *  1. every HTML page declares the scripts/CSS it references and those files exist
 *  2. the content JSON files parse and satisfy their contracts
 *  3. each page contains the DOM mount points its registered modules need
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'art.html', 'studio.html', 'about.html', 'contact.html', 'admin.html', '404.html'];

let problems = 0;
const fail = (msg) => { problems++; console.log('  ✖ ' + msg); };
const ok   = (msg) => console.log('  ✔ ' + msg);

// ── 1. Referenced files ───────────────────────────────────────
console.log('\n[1] Recursos referenciados');
PAGES.forEach((page) => {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) { fail(`${page} não existe`); return; }

  const html = fs.readFileSync(file, 'utf8');
  const refs = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  ].filter((r) => !/^(https?:|data:|#|\/\/)/.test(r));

  let missing = 0;
  refs.forEach((ref) => {
    if (!fs.existsSync(path.join(ROOT, ref))) { fail(`${page} → ${ref} (não encontrado)`); missing++; }
  });
  if (!missing) ok(`${page}: ${refs.length} recursos OK`);
});

// ── 2. Content JSON ───────────────────────────────────────────
console.log('\n[2] Conteúdo (/content)');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

try {
  const site = read('content/site.json');
  ['site', 'artist', 'social', 'contact', 'seo'].forEach((k) => {
    if (!site[k]) fail(`content/site.json sem a seção "${k}"`);
  });
  ok('content/site.json: seções obrigatórias presentes');
} catch (e) { fail(`content/site.json inválido: ${e.message}`); }

try {
  const art = read('content/art.json');
  if (!Array.isArray(art.artworks) || art.artworks.length === 0) fail('content/art.json sem artworks');
  art.artworks.forEach((a, i) => {
    const textOk = (v) => typeof v === 'string' || (v && (typeof v.en === 'string' || typeof v.pt === 'string'));
    if (!a.id) fail(`artworks[${i}] sem id`);
    if (!textOk(a.title)) fail(`artworks[${i}] title inválido`);
    if (!textOk(a.category)) fail(`artworks[${i}] category inválido`);
    if (!textOk(a.description)) fail(`artworks[${i}] description inválido`);
    if (typeof a.imageUrl !== 'string' || !a.imageUrl) fail(`artworks[${i}] imageUrl inválido`);
    if (typeof a.nsfw !== 'boolean') fail(`artworks[${i}] nsfw deve ser boolean`);
  });
  ok(`content/art.json: ${art.artworks.length} obras conforme ArtworkTypes`);
} catch (e) { fail(`content/art.json inválido: ${e.message}`); }

try {
  const studio = read('content/studio.json');
  if (!studio.meta) fail('content/studio.json sem meta');
  ['highlights', 'roadmap', 'posts', 'links'].forEach((k) => {
    if (!Array.isArray(studio[k])) fail(`content/studio.json: "${k}" deve ser array`);
  });
  // Support block (dedicated payment area) — optional, validated when present
  if (studio.support !== undefined) {
    const support = studio.support;
    if (!support || typeof support !== 'object' || Array.isArray(support)) {
      fail('content/studio.json: "support" deve ser objeto');
    } else {
      if (!Array.isArray(support.methods)) fail('content/studio.json: "support.methods" deve ser array');
      (support.methods || []).forEach((m, i) => {
        if (!m || typeof m !== 'object') { fail(`support.methods[${i}] inválido`); return; }
        if (typeof m.label !== 'string' && !(m.label && (m.label.en || m.label.pt))) fail(`support.methods[${i}] label inválido`);
        if (typeof m.url !== 'string') fail(`support.methods[${i}] url deve ser string`);
        if (m.url && !/^https:\/\//i.test(m.url)) fail(`support.methods[${i}] url deve ser https`);
      });
      const qr = support.qrImage;
      if (qr && typeof qr === 'string' && !/^(assets\/|https:\/\/)/i.test(qr)) fail('support.qrImage deve ser assets/… ou https://…');
      if (typeof support.pixKey !== 'undefined' && typeof support.pixKey !== 'string') fail('support.pixKey deve ser string');
    }
  }
  ok('content/studio.json: contrato agnóstico OK');
} catch (e) { fail(`content/studio.json inválido: ${e.message}`); }

// ── 3. Mount points por página ────────────────────────────────
console.log('\n[3] Mount points por página');
const REQUIRED = {
  'index.html': ['nav-link-home', 'lang-switch-btn', 'theme-toggle-btn', 'admin-link-btn', 'hero-canvas', 'footer-year'],
  'art.html': ['nav-link-art', 'gallery-grid', 'gallery-filters', 'nsfw-checkbox', 'gallery-load-more', 'lang-switch-btn', 'theme-toggle-btn'],
  'about.html': ['nav-link-about', 'about-avatar', 'about-bio', 'about-specialties', 'about-stat-years', 'about-stat-projects', 'about-stat-clients', 'lang-switch-btn', 'theme-toggle-btn'],
  'contact.html': ['nav-link-contact', 'contact-socials', 'contact-email', 'lang-switch-btn', 'theme-toggle-btn'],
  'studio.html': ['nav-link-studio', 'studio-root', 'studio-support-section', 'studio-support-content', 'studio-support-title', 'studio-highlights', 'studio-posts', 'studio-roadmap', 'studio-links', 'lang-switch-btn'],
  'admin.html': ['gate-overlay', 'gate-pass', 'gate-confirm', 'gate-submit', 'gate-error', 'nav-btn-studio', 'nav-btn-publish',
                 'pane-studio', 'pane-publish', 'studio-highlights-editor', 'studio-posts-editor', 'studio-roadmap-editor', 'studio-links-editor',
                 'studio-support-methods-editor', 's-support-enabled', 's-support-title-en', 's-support-story-pt', 's-support-qr', 's-support-pix',
                 's-studio-name-en', 's-studio-intro-en', 'pub-owner', 'pub-repo', 'pub-branch', 'pub-token', 'pub-publish', 'pub-export-all',
                 'pub-log', 'pub-status', 'sec-change', 'sec-lock', 's-artworks-list', 'admin-save-btn'],
};

Object.keys(REQUIRED).forEach((page) => {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const missing = REQUIRED[page].filter((id) => !ids.has(id));
  if (missing.length) fail(`${page} sem: ${missing.join(', ')}`);
  else ok(`${page}: ${REQUIRED[page].length} mount points OK`);
});

// ── 4. Postura de segurança (blue team) ───────────────────────
console.log('\n[4] Postura de segurança');
const CSP_PATTERN = /Content-Security-Policy[^>]*script-src\s+'self'/;

PAGES.forEach((page) => {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  if (!CSP_PATTERN.test(html)) fail(`${page}: CSP com script-src 'self' ausente`);
  const inlineScripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>/g)];
  if (inlineScripts.length) fail(`${page}: ${inlineScripts.length} script(s) inline (quebra a CSP)`);
});

const cspPages = PAGES.filter((page) =>
  CSP_PATTERN.test(fs.readFileSync(path.join(ROOT, page), 'utf8'))
);
if (cspPages.length === PAGES.length) ok(`CSP presente nas ${PAGES.length} páginas`);

if (!fs.existsSync(path.join(ROOT, '.nojekyll'))) fail('.nojekyll ausente');
else ok('.nojekyll presente');

if (!fs.existsSync(path.join(ROOT, '.gitignore'))) fail('.gitignore ausente');
else {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (!/\.tmp-check/.test(gi)) fail('.gitignore não cobre .tmp-check/');
  else ok('.gitignore cobre artefatos de teste (.tmp-check/)');
}

// Content JSONs must not contain active-content patterns or secrets.
const DANGEROUS = [
  /<\s*(script|iframe|object|embed)\b/i,
  /\son(?:error|load|click|mouseover|focus)\s*=/i,
  /javascript\s*:/i,
  /data:\s*text\s*\/\s*html/i,
  /"__proto__"\s*:/,
  /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
['content/site.json', 'content/art.json', 'content/studio.json'].forEach((p) => {
  const raw = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const hits = DANGEROUS.filter((rx) => rx.test(raw)).length;
  if (hits) fail(`${p}: ${hits} padrão(ões) perigoso(s) no conteúdo`);
  else ok(`${p}: sem padrões perigosos`);
});

// ── Result ────────────────────────────────────────────────────
console.log(problems === 0
  ? '\n✅ Validação concluída sem problemas.\n'
  : `\n❌ ${problems} problema(s) encontrado(s).\n`);

process.exit(problems === 0 ? 0 : 1);
