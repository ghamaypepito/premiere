/**
 * v27 — drop the duplicated sub-line under "Why it matters".
 *
 * The client's 29 Sep edit replaced the unsourced statistic in the H2 with
 * their own sentence ("The families that last decided early, and in writing,
 * who leads, who owns, and how the family will handle disagreement.") and
 * deleted the source placeholder.
 *
 * What they did not touch was the sub-line underneath, which was the original
 * copy and now said the same thing a second time in weaker words ("The ones
 * that survive decided early, and in writing, ..."). Their heading is the
 * keeper; the leftover goes.
 *
 * That leaves the eyebrow and one statement, which is how this section was
 * always meant to read.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;

/* Anchored on the heading above it as well, so this can only match the one
   sub-line it is meant to remove. */
const a = `      H('The families that last decided early, and in writing, who leads, who owns, and how the family will handle disagreement.', 'h2', 50, {align:'center', lh:1.15, t:40, m:30}),
      T('<p>The ones that survive decided early, and in writing, who leads, who owns, and how the family will handle disagreement.</p>', {align:'center', size:18})`;
const b = `      H('The families that last decided early, and in writing, who leads, who owns, and how the family will handle disagreement.', 'h2', 50, {align:'center', lh:1.15, t:40, m:30})`;

if (!s.includes(a)) throw new Error('missing: why-it-matters sub-line');
if (s.split(a).length - 1 !== 1) throw new Error('not unique: why-it-matters sub-line');
s = s.replace(a, b);

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
s = s.replace(/const BUILD_ID = '[^']*';/,
  `const BUILD_ID = 'v27 ${stamp} UTC (why-it-matters de-duplicated)';`);

/* Removing one line only; refuse anything larger. */
const delta = s.length - before;
if (delta > 0 || delta < -260) throw new Error(`size change looks wrong: ${delta} bytes`);

fs.writeFileSync('premier-elementor-build.txt', s);
console.log(`v27 applied: ${before} -> ${s.length} bytes (${delta})`);
