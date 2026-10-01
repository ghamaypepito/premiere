/**
 * v25 — reconcile the client's Home edit, made in Elementor on 29 Sep.
 *
 * They replaced the H2 statistic ("Roughly a third of family businesses reach
 * the second generation...") with the sentence that had been sitting under it,
 * and deleted the "[Source to be cited before launch]" placeholder.
 *
 * That is the right call: the figure was never sourced, and an unsourced
 * statistic on the home page of a consulting firm is a liability. Porting it
 * here so republishing the build no longer overwrites their edit.
 *
 * Their change left the old sub-line in place, which now repeats the heading
 * almost word for word ("The families that last decided early..." above "The
 * ones that survive decided early..."). Reproduced verbatim rather than
 * rewritten — their copy is theirs to tighten, and flagged for them to decide.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* The heading now carries the sub-line's sentence, and the unsourced figure and
   its placeholder are gone. Anchored on all three lines together so this can
   only match the one block it is meant to. */
rep(`      H('Roughly a third of family businesses reach the second generation. Around one in eight reach the third.', 'h2', 50, {align:'center', lh:1.15, t:40, m:30}),
      T('<p>The ones that survive decided early, and in writing, who leads, who owns, and how the family will handle disagreement.</p>', {align:'center', size:18}),
      T('<p>[Source to be cited before launch]</p>', {align:'center', size:12, c:'#6B7280'})`,
`      H('The families that last decided early, and in writing, who leads, who owns, and how the family will handle disagreement.', 'h2', 50, {align:'center', lh:1.15, t:40, m:30}),
      T('<p>The ones that survive decided early, and in writing, who leads, who owns, and how the family will handle disagreement.</p>', {align:'center', size:18})`,
  'why-it-matters copy');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
s = s.replace(/const BUILD_ID = '[^']*';/,
  `const BUILD_ID = 'v25 ${stamp} UTC (client Home edit reconciled)';`);

/* A wrong anchor can silently eat a large block, so refuse an implausible
   size change rather than writing it out. This patch only removes copy. */
const delta = s.length - before;
if (delta > 0 || delta < -600) throw new Error(`size change looks wrong: ${delta} bytes`);

fs.writeFileSync('premier-elementor-build.txt', s);
console.log(`v25 applied: ${before} -> ${s.length} bytes (${delta})`);
