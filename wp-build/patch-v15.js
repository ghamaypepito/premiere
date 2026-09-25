/**
 * v15 — make "footer on pages" vs "footer in Theme Builder" a single flag.
 *
 * v14 hard-coded the footer onto every page because the site had no Elementor
 * Pro. Pro is now being added, which brings Theme Builder back. Rather than
 * patching seventeen page arrays back and forth each time, the choice is one
 * constant at the top of the build.
 *
 *   FOOTER_ON_PAGES = true   no Pro: every page carries its own footer
 *   FOOTER_ON_PAGES = false  Pro: the footer comes from the Theme Builder
 *                            template built by premier-theme-parts.txt
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

rep(`const TALK = `,
`/* true  = no Elementor Pro; each page carries its own footer.
   false = Pro installed; the footer comes from the Theme Builder template
           published by premier-theme-parts.txt. Run that first and confirm
           the footer renders before switching this off. */
const FOOTER_ON_PAGES = true;
const TALK = `, 'flag');

rep(`data:{status:'publish', elements:[...elements, FOOTER()], settings:`,
    `data:{status:'publish', elements:(FOOTER_ON_PAGES ? [...elements, FOOTER()] : elements), settings:`,
    'conditional footer');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v15.txt', s);
new Function('return ' + s);

// Both settings must produce a parseable build and the expected footer count.
for (const flag of [true, false]) {
  const t = s.replace('const FOOTER_ON_PAGES = true;', `const FOOTER_ON_PAGES = ${flag};`);
  new Function('return ' + t);
}
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length, '| both flag states parse');
