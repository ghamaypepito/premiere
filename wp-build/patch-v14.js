/**
 * v14 — put the footer back on the pages, because Elementor Pro is not installed.
 *
 * The staging site runs Elementor 4.3.1 free with the Hello Elementor theme.
 * Theme Builder is a Pro feature, so the header and footer templates v10
 * assumed could never have been created — which is why the build reported
 * "Found header=null footer=null" and the site published with no footer at all.
 *
 * Rather than reversing v10's edits across seventeen page arrays, the footer is
 * appended once in the save loop. That keeps the page definitions clean and
 * makes this a one-line revert if Pro is bought later.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

// FOOTER() carries the booking dialog too, so both come back together.
rep(
  `data:{status:'publish', elements, settings:`,
  `data:{status:'publish', elements:[...elements, FOOTER()], settings:`,
  'append footer at save time'
);

if (!s.includes('const FOOTER =')) throw new Error('FOOTER helper is missing from the prelude');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v14.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
