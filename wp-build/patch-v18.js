/**
 * v18 — the six credential conflicts, resolved in favour of the bio deck.
 *
 * Premier's instruction: where the Consultant Credentials deck and the live
 * site disagree, the deck wins.
 *
 * Neil's surname changes throughout, including his profile page slug, so
 * premier-slugs.txt covers post 157 as well.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const repAll = (a, b, label, n) => {
  const hits = s.split(a).length - 1;
  if (hits !== n) throw new Error(`${label}: expected ${n}, found ${hits}`);
  s = s.split(a).join(b);
};
const rep = (a, b, label) => repAll(a, b, label, 1);

/* 1. Montescarlos -> Montesclaros. "Arnold" is kept: the deck's slide title
      drops the middle name, which is a title style rather than a correction. */
repAll('Neil Arnold Montescarlos', 'Neil Arnold Montesclaros', 'neil name', 4);
repAll('Neil Arnold C. Montescarlos', 'Neil Arnold C. Montesclaros', 'neil full name', 1);
repAll('/who-we-are/our-team/neil-arnold-montescarlos/', '/who-we-are/our-team/neil-arnold-montesclaros/', 'neil slug', 2);

/* 2. Jefferson Tio: RODC, not RODP, plus the doctorate in progress. */
repAll('MBA, CFBA, RODP<br>Chief Partnership and Relationship Officer',
       'MBA, CFBA, RODC, PhD (c)<br>Chief Partnership and Relationship Officer', 'jeff creds', 2);

/* 3. Atty. Auman: a title change, not a correction. */
rep(`P4('auman', 'Atty. Evangeline Auman', 'Legal Affairs Manager')`,
    `P4('auman', 'Atty. Evangeline &ldquo;Van&rdquo; C. Auman', 'Senior Partner, Ownership Planning and Chief Legal Affairs')`,
    'auman');

/* 4. Marvin Soco covers VisMin and is a senior consultant. */
rep(`P4('marvin', 'Marvin Soco', 'MBA, CFBA<br>Relationship Manager')`,
    `P4('marvin', 'Marvin Soco', 'MBA, CFBA<br>Relationship Manager, VisMin and Senior Consultant')`,
    'marvin');

/* 5. Atty. Lagundi is Jr., and holds a JD alongside the CPA. */
repAll(`'Atty. Domingo Lagundi', 'CPA<br>Relationship Director'`,
       `'Atty. Domingo Lagundi Jr.', 'CPA, JD<br>Relationship Director'`, 'lagundi', 2);

/* 6. JR Hernandez: the deck describes a different role from the site's. */
rep(`P4('jr', 'JR Hernandez', 'Relationship Manager, Luzon')`,
    `P4('jr', 'JR Hernandez', 'Parenting and Relationship Coach<br>Brand Development and Strategic Thinking Consultant')`,
    'jr');

if (/Montescarlos|RODP/.test(s)) throw new Error('an old spelling survived');
if (Math.abs(s.length - before) > 1200) throw new Error(`size moved by ${s.length - before}; refusing to write`);

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v18.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
