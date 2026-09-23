/**
 * v10 — the footer moves to a Theme Builder template.
 *
 * Until now FOOTER() was appended to all 15 page arrays, so a footer change
 * meant re-saving 15 pages. The footer (and with it the booking dialog, which
 * lives inside it) now ships once as an Elementor Theme Builder footer applied
 * to the entire site, built by premier-theme-parts.txt.
 *
 * Run premier-theme-parts.txt FIRST and confirm the footer renders, otherwise
 * these pages publish with no footer at all.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');

const before = (s.match(/^ {2}FOOTER\(\)$/gm) || []).length;
if (before !== 15) throw new Error('expected 15 FOOTER() call sites, found ' + before);

// Each call site is the last element of a page array. Most close with "];",
// but the shared leader-profile template closes with "].filter(Boolean);".
s = s.replace(/,\n {2}FOOTER\(\)\n\]/g, '\n]');

const after = (s.match(/^ {2}FOOTER\(\)$/gm) || []).length;
if (after !== 0) throw new Error('missed ' + after + ' FOOTER() call sites — shape differs');

// FOOTER and BOOKING stay defined: premier-theme-parts.txt is generated from
// this prelude, so removing them here would break the Theme Builder build.
for (const needed of ['const FOOTER =', 'const BOOKING =']) {
  if (!s.includes(needed)) throw new Error('prelude lost ' + needed);
}

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v10.txt', s);

new Function('return ' + s);
console.log('ok, bytes', s.length, '| footers removed:', before, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
