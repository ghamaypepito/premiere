/**
 * v22 — default FOOTER_ON_PAGES to false.
 *
 * The site now has Elementor Pro and a working Theme Builder footer, so pages
 * carrying their own footer as well produced two on every page. The flag
 * defaulted to true from when there was no Pro and the pages had to carry it,
 * and shipping that default meant the duplicate came back on the next paste.
 *
 * True is now the exceptional case, so it stops being the default.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;

const old = `/* true  = no Elementor Pro; each page carries its own footer.
   false = Pro installed; the footer comes from the Theme Builder template
           published by premier-theme-parts.txt. Run that first and confirm
           the footer renders before switching this off. */
const FOOTER_ON_PAGES = true;`;
const neu = `/* false = the footer comes from the Theme Builder template published by
           premier-theme-parts.txt. This is the live setup.
   true  = no Elementor Pro; every page carries its own footer instead.
           Only set this if the Theme Builder footer is gone, or the site
           renders two footers. */
const FOOTER_ON_PAGES = false;`;
if (!s.includes(old)) throw new Error('flag block not found');
s = s.replace(old, neu);

if (!/const FOOTER_ON_PAGES = false;/.test(s)) throw new Error('flag did not flip');
if (Math.abs(s.length - before) > 400) throw new Error(`size moved by ${s.length - before}`);

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v22.txt', s);
new Function('return ' + s);
const pagesBlock = (s.match(/const PAGES = \[[\s\S]*?\];/) || [''])[0];
console.log('ok, bytes', s.length, '| pages:', (pagesBlock.match(/\[\d+,'/g) || []).length,
            '| FOOTER_ON_PAGES =', (s.match(/const FOOTER_ON_PAGES = (\w+);/) || [])[1]);
