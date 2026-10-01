/**
 * v26 — let the copy read globally.
 *
 * The positioning language kept narrowing the audience to one nationality
 * ("Filipino business families", "Southeast Asian family business leaders")
 * while the firm's own record says otherwise: clients across the Philippines
 * and abroad, a founder on the Family Firm Institute's global board in Boston,
 * an international conference, and alliances reaching from Nairobi to Manila.
 *
 * So this is a narrowing in the marketing copy, not in the business. Only the
 * marketing copy changes here.
 *
 * What is deliberately NOT touched, because it is the factual record and
 * rewriting it would be invention rather than positioning:
 *   - the Cebu office address, phone numbers and office photo caption
 *   - every milestone (conference cities, dates, chamber partnerships)
 *   - credentials, universities and the FFI fellowship, including "first
 *     Filipino on its global Board of Directors" — that is a distinction,
 *     and a global one
 *   - the affiliate chambers and the "across the country" that describes
 *     them, which is accurate: that group is Philippine
 *   - Imee Gaddi's title, the book launch details, and the client quotes
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* The home hero. The single most important line on the site, and the one that
   told every visitor from outside the country that the firm was not for them. */
rep(`<p>We help Filipino business families keep the family whole and the business growing, through succession, governance and the hard conversations in between.</p>`,
    `<p>We help business families keep the family whole and the business growing, through succession, governance and the hard conversations in between.</p>`,
    'home hero subtitle');

/* Family Enterprise Planning hero subtitle. */
rep(`'Succession and continuity planning for Filipino family businesses',`,
    `'Succession and continuity planning for family businesses',`,
    'FEP subtitle');

/* Theresa's bio. The count and the reach are the facts and both survive —
   "across the Philippines and abroad" already says where, so the adjective
   was doing nothing but narrowing. */
rep(`'She has served more than 80 Filipino family businesses across the Philippines and abroad,`,
    `'She has served more than 80 family businesses across the Philippines and abroad,`,
    'Theresa bio');

/* Legacy in Action. The book is about families in business, not a region. */
rep(`<p>A transformative journey for families in business, and for the next generation of Southeast Asian family business leaders.</p>`,
    `<p>A transformative journey for families in business, and for the next generation of family business leaders.</p>`,
    'Legacy in Action subtitle');

/* Resources. It already promised global practice; no reason to then post it
   to one region only. */
rep(`<p>Books, roadshows and podcasts that bring global practice into the Southeast Asian context, so the business stays competitive and true to its roots.</p>`,
    `<p>Books, roadshows and podcasts that bring global practice to families in business, so the company stays competitive and true to its roots.</p>`,
    'resources intro');

/* The alliances caption. This group genuinely spans Boston, Nairobi and
   Manila, so saying so is reporting the list, not inflating it. The
   Affiliates caption below it keeps "across the country", which is accurate:
   those are Philippine chambers. */
rep(`PARTNERGROUP('Partnerships and strategic alliances', 'The institutions we work alongside.', [`,
    `PARTNERGROUP('Partnerships and strategic alliances', 'The institutions we work alongside, in the Philippines and internationally.', [`,
    'alliances caption');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
s = s.replace(/const BUILD_ID = '[^']*';/,
  `const BUILD_ID = 'v26 ${stamp} UTC (global positioning)';`);

/* A wrong anchor can silently eat a large block. These edits trim a few words
   and add one clause, so the net change is small either way. */
const delta = s.length - before;
if (delta > 400 || delta < -400) throw new Error(`size change looks wrong: ${delta} bytes`);

fs.writeFileSync('premier-elementor-build.txt', s);
console.log(`v26 applied: ${before} -> ${s.length} bytes (${delta})`);
