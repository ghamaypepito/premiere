/**
 * v29 — the What We Do page title.
 *
 * "Family business programs, built around one family." becomes "How We Help
 * Families in Business", as asked.
 *
 * Only the H1 changes. The eyebrow above it still reads "What we do", and the
 * nav label stays "What We Do": the new title is 32 characters and would wrap
 * the menu onto a second line at the widths the header was built for.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;

const a = `H('Family business programs, built around one family.', 'h1', 64, {lh:1.05, m:38, t:48})`;
const b = `H('How We Help Families in Business', 'h1', 64, {lh:1.05, m:38, t:48})`;

if (!s.includes(a)) throw new Error('missing: what-we-do h1');
if (s.split(a).length - 1 !== 1) throw new Error('not unique: what-we-do h1');
s = s.replace(a, b);

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
s = s.replace(/const BUILD_ID = '[^']*';/,
  `const BUILD_ID = 'v29 ${stamp} UTC (what-we-do title, bigger logo)';`);

const delta = s.length - before;
if (delta > 0 || delta < -40) throw new Error(`size change looks wrong: ${delta} bytes`);

fs.writeFileSync('premier-elementor-build.txt', s);
console.log(`v29 applied: ${before} -> ${s.length} bytes (${delta})`);
