/**
 * v16 — make the console scripts print their own result.
 *
 * Each script is an async IIFE that returns a string. Chrome prints
 * "Promise {<pending>}" the moment it is pasted and never refreshes that line,
 * so the result is invisible unless you know to re-expand the object. Every
 * script now logs its result, and logs failures instead of swallowing them.
 */
const fs = require('fs');

const TAIL = `()
  .then(r => console.log('%c' + r, 'font-size:13px;line-height:1.6'))
  .catch(e => console.error('SCRIPT FAILED:', e));
`;

let done = [];
for (const f of ['premier-elementor-build.txt', 'premier-slugs.txt']) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('.then(r => console.log')) { done.push(f + ' (already)'); continue; }
  const trimmed = s.replace(/\)\(\)\s*$/, ')');
  if (trimmed === s) throw new Error('could not find the trailing IIFE call in ' + f);
  s = trimmed + TAIL;
  new Function('return ' + s.replace(/\n\s*\.then[\s\S]*$/, ''));
  fs.writeFileSync(f, s);
  done.push(f);
}
console.log('patched:', done.join(', '));
