/**
 * v21 — the home team block becomes a centred stack.
 *
 * Title, paragraph and link centred at the top, the four portraits centred in
 * a row beneath, matching the reference Premier supplied rather than the
 * text-left / portraits-right split.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;

const start = s.indexOf(`  S({pt:0, pb:144, pbm:64, gap:0}, [
    Row({gap:64, align:'center'}, [
      Col(34, {gap:22}, [
        EB('Our team'),`);
if (start < 0) throw new Error('team block not found');
const endMarker = `  ]),\n  HOWITWORKS(),`;
const end = s.indexOf(endMarker, start);
if (end < 0) throw new Error('team block end not found');

const REPLACEMENT = `  S({pt:0, pb:144, pbm:64, gap:56}, [
    Col(100, {gap:20, s:{flex_align_items:'center', css_classes:'pfb-teamhead'}}, [
      EB('Our team', {align:'center'}),
      H('Together, let&rsquo;s build your family legacy.', 'h2', 46, {m:32, align:'center'}),
      T('<p>The only multidisciplinary team of family business consultants in the region, with global knowledge, local expertise and regional coverage.</p>', {size:16.5, align:'center'}),
      BTN('Meet the team', LINK.who, 'l', {align:'center'}),
      CIRCLESCSS()
    ]),
    Row({gap:28, rgap:34, wrap:true, justify:'center', s:{flex_direction_mobile:'row', css_classes:'pfb-circles'}}, [
      CIRCLE('jon', 'Jon Ramos', 'CEO and Founder'),
      CIRCLE('neil', 'Neil Arnold Montesclaros', 'Chief Operations Officer'),
      CIRCLE('jeff', 'Jefferson Tio', 'Chief Partnership and Relationship Officer'),
      CIRCLE('gen', 'Genevieve Ramos', 'Chief Finance Officer')
    ])
`;
s = s.slice(0, start) + REPLACEMENT + s.slice(end);

/* Centre the heading block and keep the row from stretching edge to edge. */
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  s = s.replace(a, b);
};
rep(`.pfb-circles{flex-wrap:nowrap!important}`,
`.pfb-teamhead{text-align:center;max-width:720px;margin:0 auto}
.pfb-teamhead .elementor-widget-button{display:flex;justify-content:center}
.pfb-circles{flex-wrap:nowrap!important;justify-content:center!important;max-width:940px;margin:0 auto}`,
 'centre css');

if (Math.abs(s.length - before) > 1500) throw new Error(`size moved by ${s.length - before}; refusing to write`);
fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v21.txt', s);
new Function('return ' + s);
const pagesBlock = (s.match(/const PAGES = \[[\s\S]*?\];/) || [''])[0];
console.log('ok, bytes', s.length, '| pages:', (pagesBlock.match(/\[\d+,'/g) || []).length);
