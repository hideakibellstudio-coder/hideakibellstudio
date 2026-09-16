/**
 * Smoke test — boots each page in headless Chrome and asserts the DOM.
 * Run: node tools/smoke.js
 *
 * Requires a local static server on BASE (default http://127.0.0.1:8765), e.g.
 *   python -m http.server 8765 --bind 127.0.0.1
 *
 * Notes:
 *  - Chrome runs with --dump-dom, which waits --virtual-time-budget ms, so
 *    async work (fetch of /content/*.json) has time to finish.
 *  - Case [5] maps a non-local hostname to 127.0.0.1 so the studio is reached
 *    as if it were the published site (the gate must be enforced there).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const BASE   = process.env.BASE || 'http://127.0.0.1:8765';
const BUDGET = process.env.BUDGET || '9000';
const TMP    = path.join(__dirname, '..', '.tmp-check');
const PROFILE = path.join(TMP, 'profile');
const PUBLIC_HOST = 'public.test';

let problems = 0;
const ok   = (m) => console.log('  ✔ ' + m);
const fail = (m) => { problems++; console.log('  ✖ ' + m); };

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.log('✖ Nenhum Chrome/Edge encontrado — smoke test ignorado.');
  process.exit(0);
}

fs.mkdirSync(TMP, { recursive: true });

/** Load a page in headless Chrome and return its serialized DOM + console log. */
function dump(url, extraArgs = []) {
  const domFile = path.join(TMP, 'smoke.dom.html');
  const logFile = path.join(TMP, 'smoke.log.txt');

  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${PROFILE}`,
    `--virtual-time-budget=${BUDGET}`,
    '--enable-logging=stderr', '--log-level=0',
    ...extraArgs,
    '--dump-dom', url,
  ], { stdio: ['ignore', fs.openSync(domFile, 'w'), fs.openSync(logFile, 'w')] });

  return {
    html: fs.readFileSync(domFile, 'utf8'),
    log:  fs.readFileSync(logFile, 'utf8'),
  };
}

const count = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;
const has   = (html, needle) => html.includes(needle);
const check = (page, label, condition, detail = '') =>
  condition ? ok(`${page}: ${label}`) : fail(`${page}: ${label} ${detail}`);

/** Report real JS failures found in Chrome's console log. */
function assertNoJsErrors(page, log) {
  const errors = log
    .split(/\r?\n/)
    .filter((l) => /Uncaught|ReferenceError|TypeError|SyntaxError/.test(l));
  check(page, 'sem erros de JavaScript no console', errors.length === 0, errors[0] || '');
}

// ── 1. Home (hub) ─────────────────────────────────────────────
console.log('\n[1] index.html (hub)');
{
  const { html, log } = dump(`${BASE}/index.html`);
  assertNoJsErrors('index.html', log);
  check('index.html', '2 cards de área renderizados', count(html, 'hub-card__title') === 2, `(${count(html, 'hub-card__title')})`);
  check('index.html', 'link para a área de arte', has(html, 'href="art.html"'));
  check('index.html', 'link para a área de software', has(html, 'href="studio.html"'));
  check('index.html', 'galeria não existe nesta página', !has(html, 'id="gallery-grid"'));
  check('index.html', 'ano do rodapé preenchido', /id="footer-year">\d{4}</.test(html));
  check('index.html', 'area nao marcada como atual no hub', /id="nav-link-home"[^>]*aria-current="page"/.test(html));
}

// ─ 2. Art area ───────────────────────────────────────────────
console.log('\n[2] art.html (área de arte)');
{
  const { html, log } = dump(`${BASE}/art.html`);
  assertNoJsErrors('art.html', log);
  const cards = count(html, 'artwork-card__title');
  check('art.html', 'obras renderizadas de content/art.json', cards >= 3, `(${cards})`);
  check('art.html', 'filtros montados', count(html, 'class="filter-btn') >= 2);
  check('art.html', 'lightbox montado', has(html, 'lightbox-overlay'));
  check('art.html', 'age gate montado', has(html, 'age-gate-overlay'));
  check('art.html', 'nav marca a área atual', /id="nav-link-art"[^>]*aria-current="page"/.test(html));
  check('art.html', 'textos bilíngues resolvidos', !has(html, '[object Object]'));
}

// ── 3. Software area ──────────────────────────────────────────
console.log('\n[3] studio.html (área de software, agnóstica)');
{
  const { html, log } = dump(`${BASE}/studio.html`);
  assertNoJsErrors('studio.html', log);
  check('studio.html', 'nome vindo de content/studio.json', /data-studio="name"[^>]*>[^<]+</.test(html));
  check('studio.html', 'highlights renderizados', count(html, 'studio-card__title') === 3, `(${count(html, 'studio-card__title')})`);
  check('studio.html', 'entradas (feed) renderizadas', count(html, 'studio-post__title') >= 1);
  check('studio.html', 'roadmap renderizado', count(html, 'studio-roadmap__item') >= 1);
  check('studio.html', 'versão exibida', /data-studio="version"[^>]*>v[^<]+</.test(html));
  check('studio.html', 'nav marca a área atual', /id="nav-link-studio"[^>]*aria-current="page"/.test(html));
  check('studio.html', 'links sem URL não renderizam', count(html, 'class="studio-link" href') === 0);
}

// ── 4. Admin local (gate liberado) ────────────────────────────
console.log('\n[4] admin.html (local — estúdio abre)');
{
  const { html, log } = dump(`${BASE}/admin.html`);
  assertNoJsErrors('admin.html', log);
  check('admin.html', 'body destravado em host local', !/<body[^>]*is-locked/.test(html));
  check('admin.html', 'editor de highlights montado do JSON', count(html, 'data-field="icon"') >= 3, `(${count(html, 'data-field="icon"')})`);
  check('admin.html', 'editor de entries montado do JSON', count(html, 'data-field="date"') >= 1);
  check('admin.html', 'campos do meta preenchidos', !/id="s-studio-name-en"[^>]*value=""/.test(html));
  check('admin.html', 'status de override por arquivo', count(html, 'data-override-status=') === 3);
  check('admin.html', 'botão de publicar presente', has(html, 'id="pub-publish"'));
}

// ── 5. Admin como site publicado (gate exigido) ───────────────
console.log('\n[5] admin.html (host público — gate obrigatório)');
{
  const { html, log } = dump(`http://${PUBLIC_HOST}:8765/admin.html`, [
    `--host-resolver-rules=MAP ${PUBLIC_HOST} 127.0.0.1`,
  ]);
  assertNoJsErrors('admin.html (público)', log);
  check('admin.html (público)', 'body bloqueado', /<body[^>]*is-locked/.test(html));
  check('admin.html (público)', 'dashboard não inicializado (sem editores)', count(html, 'data-field="icon"') === 0);
  check('admin.html (público)', 'overlay do gate presente', /class="gate-overlay" id="gate-overlay"/.test(html));
}

// ── 6. About page ─────────────────────────────────────────────
console.log('\n[6] about.html (página dedicada)');
{
  const { html, log } = dump(`${BASE}/about.html`);
  assertNoJsErrors('about.html', log);
  check('about.html', 'bio renderizada de content/site.json', count(html, 'about__bio') >= 1 && /<div class="about__bio" id="about-bio"><p/.test(html));
  check('about.html', 'especialidades renderizadas', count(html, 'specialty-tag') >= 1);
  check('about.html', 'nav marca a página atual', /id="nav-link-about"[^>]*aria-current="page"/.test(html));
  check('about.html', 'links cruzados de área presentes', has(html, 'href="art.html"') && has(html, 'href="contact.html"'));
}

// ── 7. Contact page ───────────────────────────────────────────
console.log('\n[7] contact.html (página dedicada)');
{
  const { html, log } = dump(`${BASE}/contact.html`);
  assertNoJsErrors('contact.html', log);
  check('contact.html', 'e-mail do content aplicado', /id="contact-email"[^>]*href="mailto:[^"]+"/.test(html));
  // Socials render only when URLs exist in content/site.json; with empty
  // socials the wrapper must hide itself — both states are correct.
  const socialsEmpty = Object.values((require('../content/site.json').social) || {}).every((v) => !v);
  const socialsOk = socialsEmpty
    ? /id="contact-socials-wrapper"[^>]*style="[^"]*display:\s*none/.test(html) || !/class="social-link"/.test(html)
    : count(html, 'class="social-link') >= 1;
  check('contact.html', 'redes sociais consistentes com o conteúdo', socialsOk);
  check('contact.html', 'nav marca a página atual', /id="nav-link-contact"[^>]*aria-current="page"/.test(html));
  check('contact.html', 'textos bilíngues resolvidos', !has(html, '[object Object]'));
}

console.log(problems === 0
  ? '\n✅ Smoke test concluído sem problemas.\n'
  : `\n❌ ${problems} verificação(ões) falharam.\n`);

process.exit(problems === 0 ? 0 : 1);
