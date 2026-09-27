/**
 * v23 — stamp the build so a run says which version it was.
 *
 * Every download has the same filename, so an older copy is easy to paste by
 * mistake, and nothing in the output distinguished them. The result line now
 * names the build and the footer setting.
 */
const fs = require('fs');
const { execSync } = require('child_process');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
let sha = 'nogit';
try { sha = execSync('git rev-parse --short HEAD', {encoding: 'utf8'}).trim(); } catch (e) {}

if (/const BUILD_ID =/.test(s)) throw new Error('already stamped; bump it in place instead');

s = s.replace(`const TALK = `, `const BUILD_ID = 'v23 ${stamp} UTC (${sha})';\nconst TALK = `);

s = s.replace(`if (missingOptional.length) out.push('\\nlogos not yet uploaded, left out: ' + missingOptional.join(', '));`,
`if (missingOptional.length) out.push('\\nlogos not yet uploaded, left out: ' + missingOptional.join(', '));
out.push('\\nbuild ' + BUILD_ID + ' | footer on pages: ' + FOOTER_ON_PAGES);`);

if (!/BUILD_ID/.test(s)) throw new Error('stamp not applied');
if (Math.abs(s.length - before) > 400) throw new Error(`size moved by ${s.length - before}`);

fs.writeFileSync('premier-elementor-build.txt', s);
new Function('return ' + s);
console.log('stamped:', (s.match(/const BUILD_ID = '([^']+)'/) || [])[1]);
