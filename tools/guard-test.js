/**
 * Content Guard self-test (not part of the site).
 * Run: node tools/guard-test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'core', 'settings-panel', 'private', 'content-guard', 'index.js'),
  'utf8'
);

const sandbox = {
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
  },
};
vm.createContext(sandbox);
// `const` at script top-level doesn't attach to the sandbox global — export it explicitly.
vm.runInContext(src + '\nthis.ContentGuard = ContentGuard;', sandbox);
const Guard = sandbox.ContentGuard;

let failures = 0;
const check = (name, cond) => {
  console.log((cond ? '  ✔ ' : '  ✖ ') + name);
  if (!cond) failures++;
};

Guard.init();

// 1. Clean content passes
const clean = Guard.audit({
  meta: { name: { en: 'AetherPaint' }, heroImage: 'assets/images/hero.png' },
  posts: [{ id: 'p1', title: { en: 'Release v0.2' }, body: 'New brush engine.' }],
}, 'content/studio.json');
check('conteúdo limpo → clean', clean.clean === true);

// 2. Script injection detected
const xss = Guard.audit({ title: { en: '<script>alert(1)</script>' } }, 'art.json');
check('script injection detectada', !xss.clean && xss.findings.some((f) => f.kind === 'active-content'));

// 3. Event handler in attribute detected
const onerror = Guard.audit({ imageUrl: 'x" onerror="fetch(1)' }, 'art.json');
check('onerror em atributo detectado', !onerror.clean);

// 4. javascript: scheme in URL field detected
const jsUrl = Guard.audit({ cta: { url: 'javascript:alert(1)' } }, 'site.json');
check('javascript: em campo URL detectado', !jsUrl.clean && jsUrl.findings.some((f) => f.kind === 'dangerous-scheme'));

// 5. Prototype pollution key detected
const pollution = Guard.audit({ meta: JSON.parse('{"__proto__":{"isAdmin":true}}') }, 'site.json');
check('__proto__ detectado', !pollution.clean && pollution.findings.some((f) => f.kind === 'prototype-pollution'));

// 6. GitHub token detected (and flagged as secret for the publisher)
const SECRET = /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY/i;
const token = Guard.audit({ note: 'my token is github_pat_11ABCDEFGHIJKLMNOPQR' }, 'site.json');
check('token GitHub detectado', !token.clean && token.findings.some((f) => SECRET.test(f.sample)));

// 7. Private key detected
const pk = Guard.audit({ note: '-----BEGIN RSA PRIVATE KEY-----' }, 'site.json');
check('chave privada detectada', !pk.clean && pk.findings.some((f) => SECRET.test(f.sample)));

// 8. Benign text with angle-bracket-free apostrophes doesn't false-positive
const benign = Guard.audit({ title: { en: "It's a beautiful <world> of art & design — 100%!" } }, 'art.json');
check('texto artístico normal não alerta', benign.clean === true);

// 9. JSON.parse hook audits automatically
vm.runInContext("JSON.parse('{\"a\":{\"b\":\"<img src=x onerror=alert(1)>\"}}', null);", sandbox);
const hooked = Guard.lastReport();
check('JSON.parse monitorado registra achado', hooked && !hooked.clean);

// 10. Log persisted
check('log persistido no localStorage', Guard.getLog().length >= 1);

// 11. auditRaw handles invalid JSON
const bad = Guard.auditRaw('{oops', 'import.json');
check('JSON inválido sinalizado', bad.clean === false && bad.findings[0].kind === 'invalid-json');

console.log(failures === 0 ? '\n✅ Content Guard: todos os testes passam.\n' : `\n❌ ${failures} falha(s).\n`);
process.exit(failures === 0 ? 0 : 1);