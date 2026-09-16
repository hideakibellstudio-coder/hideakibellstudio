/**
 * Fix de mojibake (dupla codificação UTF-8 -> cp1252 -> UTF-8).
 * Reverte cada run de caracteres "altos" de volta aos bytes cp1252
 * originais e re-decodifica como UTF-8. Só aplica quando o resultado
 * é uma decodificação UTF-8 válida (sem U+FFFD) e realmente muda o texto.
 * Uso: node tools/fix-mojibake.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = path.join(__dirname, '..');

// cp1252: mapeia os codepoints 0x80-0x9F para seus bytes reais
const CP1252_HI = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function revByte(ch) {
  const c = ch.codePointAt(0);
  if (CP1252_HI[c] !== undefined) return CP1252_HI[c];
  if (c < 0x100) return c; // 0xA0-0xFF são idênticos ao Latin-1
  return null;
}

function fixRun(run) {
  // Aplica a reversão iterativamente (trata dupla/tripla codificação)
  let current = run;
  for (let pass = 0; pass < 3; pass++) {
    const re = /[\u0080-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]+/g;
    let changed = false;
    current = current.replace(re, (m) => {
      if (m.length < 2) return m;
      const bytes = [];
      for (const ch of m) {
        const b = revByte(ch);
        if (b === null) return m; // deixa como está
        bytes.push(b);
      }
      try {
        const fixed = Buffer.from(bytes).toString('utf8');
        if (!fixed.includes('\uFFFD') && /[\u0080-\uFFFF]/.test(fixed) && fixed !== m) {
          changed = true;
          return fixed;
        }
      } catch (e) { /* mantém */ }
      return m;
    });
    if (!changed) break;
  }
  return current;
}

function walk(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.tmp-check'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out = out.concat(walk(p));
    else if (/\.(html|json|js|md|css)$/.test(f.name)) out.push(p);
  }
  return out;
}

const HIGH_RE = /[\u0080-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/;

let totalFixed = 0;
for (const p of walk(ROOT)) {
  const src = fs.readFileSync(p, 'utf8');
  if (!HIGH_RE.test(src)) continue;

  // Processa linha a linha para manter o contexto das runs
  const lines = src.split('\n');
  const fixedLines = lines.map((line) => {
    if (!HIGH_RE.test(line)) return line;
    return fixRun(line);
  });
  const fixed = fixedLines.join('\n');

  if (fixed !== src) {
    const n = lines.filter((l, i) => l !== fixedLines[i]).length;
    console.log(`FIX ${path.relative(ROOT, p)}: ${n} linha(s) corrigida(s)`);
    totalFixed += n;
    if (!DRY) fs.writeFileSync(p, fixed, 'utf8');
  }
}
console.log(DRY ? `[DRY] ${totalFixed} linha(s) seriam corrigidas` : `OK: ${totalFixed} linha(s) corrigida(s)`);
