/**
 * v13 — the phone numbers.
 *
 * The new site carried 0917 316 9881 and +63 32 252 3504, taken from the
 * archived contact page. The live site carries +63.32.254.5763 and
 * +63.920.922.5581, and Premier confirmed those are current. Both are replaced
 * everywhere and both dial.
 *
 * Displayed with spaces to match this site's typography; the tel: href is
 * E.164, which is what phones and Google expect.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

const LAND = '<a href="tel:+63322545763">+63 32 254 5763</a>';
const MOB  = '<a href="tel:+639209225581">+63 920 922 5581</a>';

/* footer: the live site shows both, so show both */
rep(`<br><a href="tel:+639173169881">0917 316 9881</a><br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>`,
    `<br>` + LAND + ` &middot; ` + MOB + `<br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>`, 'footer numbers');

/* contact page */
rep(`<br><a href="tel:+639173169881">0917 316 9881</a> &middot; <a href="tel:+63322523504">+63 32 252 3504</a><br>35F Cebu Exchange Tower, Salinas Drive, Cebu City, Philippines</p>`,
    `<br>` + LAND + ` &middot; ` + MOB + `<br>35F Cebu Exchange Tower, Salinas Drive, Cebu City, Philippines</p>`, 'contact numbers');

/* privacy policy: plain text inside a JSON string literal, so no markup */
rep(`<li>By phone: +63 32 252 3504 or 0917 316 9881</li>`,
    `<li>By phone: +63 32 254 5763 or +63 920 922 5581</li>`, 'privacy numbers');

if (/0917 316 9881|252 3504|639173169881|63322523504/.test(s)) throw new Error('an old number survived');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v13.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
