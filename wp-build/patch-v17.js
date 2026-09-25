/**
 * v17 — three deck items: the programme slider, the Life at Premier gallery,
 * and the two consultants missing from the team page.
 *
 * The team page already grouped people by department, so no restructure was
 * needed there — the deck was screenshotting the existing page.
 *
 * Attachment IDs for the two new portraits are resolved by filename at run
 * time, so the images only need uploading to the media library; nobody has to
 * read IDs out of wp-admin and hand them over.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* ---- 1. the two new consultants ---- */
rep(`  rspodium:[335,'jon-ramos-speaking-family-enterprise-roadshow.jpg'], liabook:[336,'legacy-in-action-book-by-jon-ramos.jpg']`,
    `  rspodium:[335,'jon-ramos-speaking-family-enterprise-roadshow.jpg'], liabook:[336,'legacy-in-action-book-by-jon-ramos.jpg'],
  serenio:[0,'atty-darlon-serenio.jpg'], atienza:[0,'atty-leandro-atienza.jpg']`, 'new portraits');

// Atty. Serenio is a CPA and lawyer working in taxation, asset protection and
// estate planning; Atty. Atienza in estate settlement, corporate governance and
// data privacy. Both sit with Legal and compliance rather than with the
// consultants. Worth confirming with Premier.
rep(`  TEAMGROUP('Legal and compliance', [
    P4('auman', 'Atty. Evangeline Auman', 'Legal Affairs Manager'),
    P4('christine', 'Christine Marie Jovita', 'Paralegal')
  ]),`,
    `  TEAMGROUP('Legal and compliance', [
    P4('auman', 'Atty. Evangeline Auman', 'Legal Affairs Manager'),
    P4('serenio', 'Atty. Darlon Serenio', 'CPA, CMA, MBA, CFBA<br>Taxation, asset protection and estate planning'),
    P4('atienza', 'Atty. Leandro Atienza', 'JD<br>Estate settlement, corporate governance and data privacy'),
    P4('christine', 'Christine Marie Jovita', 'Paralegal')
  ]),`, 'legal group');

/* ---- 2. the programme slider (deck p10, p12) ---- */
rep(`const PROGRAMS = () => Row({gap:40, rgap:64, wrap:true}, [`,
`/* The deck asks for a slider. Sliders hide everything past the first panel,
   and these four are the main conversion path, so this stays switchable:
   set PROGRAM_SLIDER to false to go back to the 2x2 grid. */
const PROGRAM_SLIDER = true;
const SLIDERUI = () => Wd('html', {html:\`<style>
.pfb-slider__track{overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.pfb-slider__track::-webkit-scrollbar{height:5px}
.pfb-slider__track::-webkit-scrollbar-thumb{background:#DCE3EE;border-radius:0}
.pfb-slider__track > .e-con,.pfb-slider__track > div{scroll-snap-align:start;flex:0 0 48%!important}
@media(max-width:767px){.pfb-slider__track > .e-con,.pfb-slider__track > div{flex:0 0 86%!important}}
.pfb-slider__ui{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
.pfb-slider__btn{width:46px;height:46px;border:1.5px solid #193153;background:#fff;color:#193153;cursor:pointer;display:grid;place-items:center;font:16px/1 Poppins,sans-serif;transition:background .18s ease-out,color .18s ease-out}
.pfb-slider__btn:hover{background:#193153;color:#fff}
.pfb-slider__btn:disabled{opacity:.3;cursor:default}
.pfb-slider__btn:hover:disabled{background:#fff;color:#193153}
</style>
<div class="pfb-slider__ui">
<button type="button" class="pfb-slider__btn" data-dir="-1" aria-label="Previous programmes">&larr;</button>
<button type="button" class="pfb-slider__btn" data-dir="1" aria-label="Next programmes">&rarr;</button>
</div>
<script>
(function(){
  var ui=document.currentScript.parentNode.querySelector('.pfb-slider__ui'); if(!ui) return;
  var wrap=ui.closest('.pfb-slider')||ui.parentNode.parentNode;
  var track=wrap.querySelector('.pfb-slider__track'); if(!track) return;
  var sync=function(){
    var max=track.scrollWidth-track.clientWidth-2;
    ui.querySelector('[data-dir="-1"]').disabled = track.scrollLeft<=2;
    ui.querySelector('[data-dir="1"]').disabled  = track.scrollLeft>=max;
  };
  ui.addEventListener('click',function(e){
    var b=e.target.closest('.pfb-slider__btn'); if(!b) return;
    var card=track.firstElementChild;
    var step=card?card.getBoundingClientRect().width+32:track.clientWidth*0.5;
    track.scrollBy({left:step*Number(b.dataset.dir),behavior:'smooth'});
  });
  track.addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync); sync();
})();
</script>\`});

const PROGRAMS = () => PROGRAM_SLIDER
  ? C({flex_direction:'column', flex_gap:gp(14), css_classes:'pfb-slider'}, [
      C({flex_direction:'row', flex_wrap:'nowrap', flex_gap:gp(32), css_classes:'pfb-slider__track'}, PROGRAMCARDS()),
      SLIDERUI()
    ])
  : Row({gap:40, rgap:64, wrap:true}, PROGRAMCARDS());

const PROGRAMCARDS = () => [`, 'slider');

rep(`  PROGRAMCARD('council', 'Family council and board', 'Building Effective Governance', 'Turning a signed family constitution into a family council and a board that still meet, and still decide, years later.', LINK.beg)
]);`,
    `  PROGRAMCARD('council', 'Family council and board', 'Building Effective Governance', 'Turning a signed family constitution into a family council and a board that still meet, and still decide, years later.', LINK.beg)
];`, 'cards close');

/* ---- 3. Life at Premier becomes a gallery (deck p21) ---- */
/* Anchored on a regex rather than a literal, so indentation cannot break it. */
/* Anchored on the rsgroup image: a bare {gap:56, align:'center'} row also opens
   the FEP reel section 23K earlier, and matching that ran forward and would have
   deleted a third of the build. */
const galleryRe = /( *)Row\(\{gap:56, align:'center'\}, \[\n *Col\(62, \{gap:0\}, \[IMG\('rsgroup'[\s\S]*?IMG\('teamgroup', 350, \{hm:170\}\)\]\)\n *\]\)/;
const gm = s.match(galleryRe);
if (!gm) throw new Error('missing: Life at Premier captioned rows');
const ind = gm[1];
const GALLERY = [
  `/* The deck asked for a gallery rather than captioned rows, since the work`,
  `   extends beyond the office and the roadshows. */`,
  `Row({gap:20, rgap:20, wrap:true}, [`,
  `  Col(49, {gap:0, s:{width_mobile:pct(100)}}, [IMG('rsgroup', 300, {hm:200})]),`,
  `  Col(49, {gap:0, s:{width_mobile:pct(100)}}, [IMG('teamgroup', 300, {hm:200})]),`,
  `  Col(32, {gap:0, s:{width_mobile:pct(49)}}, [IMG('office', 230, {hm:140})]),`,
  `  Col(32, {gap:0, s:{width_mobile:pct(49)}}, [IMG('rssession', 230, {hm:140})]),`,
  `  Col(32, {gap:0, s:{width_mobile:pct(100)}}, [IMG('hrignite', 230, {hm:140})]),`,
  `  Col(49, {gap:0, s:{width_mobile:pct(49)}}, [IMG('rspodium', 260, {hm:150})]),`,
  `  Col(49, {gap:0, s:{width_mobile:pct(49)}}, [IMG('rsguests', 260, {hm:150})])`,
  `])`
].map(l => ind + l).join('\n').trimStart();
s = s.replace(galleryRe, ind + GALLERY);

/* ---- 4. resolve the new attachment IDs by filename at run time ---- */
rep(`const ed = await (await fetch('/wp-admin/post.php?post=27&action=elementor', {credentials:'same-origin'})).text();`,
`/* Portraits added after the original media upload carry id 0 above. Look them
   up by filename so nobody has to read IDs out of the media library. */
const unresolved = Object.entries(MEDIA).filter(([, v]) => v[0] === 0);
for (const [key, v] of unresolved) {
  const slug = v[1].replace(/\\.[a-z]+$/i, '');
  const r = await fetch('/wp-json/wp/v2/media?per_page=5&search=' + encodeURIComponent(slug), {credentials:'same-origin'});
  const j = await r.json().catch(() => []);
  const hit = Array.isArray(j) ? j.find(m => (m.source_url || '').includes(v[1])) : null;
  if (hit) MEDIA[key][0] = hit.id;
}
const stillMissing = Object.entries(MEDIA).filter(([, v]) => v[0] === 0).map(([k, v]) => v[1]);
if (stillMissing.length) return 'Upload these to the media library first, then run again: ' + stillMissing.join(', ');

const ed = await (await fetch('/wp-admin/post.php?post=27&action=elementor', {credentials:'same-origin'})).text();`, 'media resolve');

if (Math.abs(s.length - before) > 4000) {
  throw new Error(`size moved by ${s.length - before} bytes — expected a few hundred; refusing to write`);
}
fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v17.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
