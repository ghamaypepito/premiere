/**
 * v28 — stop the theme painting the scroll cue pink.
 *
 * hello-elementor's reset.css styles bare <button> elements:
 *
 *   [type=button],[type=submit],button        { border:1px solid #c36; border-radius:3px; color:#c36 }
 *   [type=button]:focus,...,button:focus,button:hover { background-color:#c36; color:#fff }
 *
 * The cue's own rule set background and border for the resting state only, so
 * it won at rest and lost on hover and focus — where the theme painted a solid
 * #CC3366 and kept it after the click, because the button holds focus.
 *
 * Fixed by stating every interactive state explicitly. .pfb-cue__btn:hover is
 * specificity (0,2,0) against the theme's (0,1,1), so it wins without
 * !important. The border radius goes too: the cue is square-cornered like the
 * buttons, and 3px was the theme's as well.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;

const a = `.pfb-cue__btn:hover{color:#193153}`;
const b = `/* The theme styles bare buttons, including a solid #c36 on hover and focus,
   so every state is claimed here rather than only the resting one. */
.pfb-cue__btn,.pfb-cue__btn:hover,.pfb-cue__btn:focus,.pfb-cue__btn:active,.pfb-cue__btn:focus-visible{
  background:none;background-color:transparent;border:0;border-radius:0;box-shadow:none;text-decoration:none}
.pfb-cue__btn:hover,.pfb-cue__btn:focus,.pfb-cue__btn:active{color:#193153}`;

if (!s.includes(a)) throw new Error('missing: cue hover rule');
if (s.split(a).length - 1 !== 1) throw new Error('not unique: cue hover rule');
s = s.replace(a, b);

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
s = s.replace(/const BUILD_ID = '[^']*';/,
  `const BUILD_ID = 'v28 ${stamp} UTC (cue keeps its own background)';`);

const delta = s.length - before;
if (delta < 0 || delta > 600) throw new Error(`size change looks wrong: ${delta} bytes`);

fs.writeFileSync('premier-elementor-build.txt', s);
console.log(`v28 applied: ${before} -> ${s.length} bytes (+${delta})`);
