/**
 * v20 — the partners and affiliates section.
 *
 * Two structural changes make it safe to ship before every logo has been
 * uploaded:
 *
 * 1. Media resolution moves to the top of the script. It used to run in the
 *    save section, after every page had already been defined, so an unresolved
 *    entry kept id 0 and rendered a 404 image URL rather than being skipped.
 * 2. Partner logos are marked optional. A missing one is left out of the page
 *    instead of blocking the whole build, so logos can be uploaded in batches.
 *
 * The split between alliances and affiliates is my reading, not Premier's.
 * Universities and institutes sit under alliances, chambers and financial
 * institutions under affiliates. Worth confirming.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* ---- 1. partner entries, marked optional with a third element ---- */
rep(`  serenio:[0,'atty-darlon-serenio.jpg'], atienza:[0,'atty-leandro-atienza.jpg']`,
`  serenio:[0,'atty-darlon-serenio.jpg'], atienza:[0,'atty-leandro-atienza.jpg'],
  /* Partner logos. The third element marks them optional: a logo that is not
     in the media library yet is left out rather than blocking the build. */
  cfbe:[0,'center-for-family-business-excellence-logo.png',1], strathmore:[0,'strathmore-university-dispute-resolution-centre-logo.png',1],
  ateneo:[0,'ateneo-de-manila-graduate-school-of-business-logo.png',1], xavier:[0,'xavier-school-logo.png',1],
  usjr:[0,'university-of-san-jose-recoletos-logo.png',1],
  ccci:[0,'cebu-chamber-of-commerce-and-industry-logo.png',1], mcci:[0,'mandaue-chamber-of-commerce-and-industry-logo.png',1],
  pccitarlac:[0,'pcci-tarlac-logo.png',1], pcciparanaque:[0,'pcci-paranaque-logo.png',1], orcham:[0,'orcham-leyte-logo.png',1],
  inlife:[0,'insular-life-logo.png',1], sunlife:[0,'sun-life-logo.png',1], rcbc:[0,'rcbc-logo.png',1], chinabank:[0,'chinabank-logo.png',1]`,
  'partner media');

/* ---- 2. move resolution above the page definitions ---- */
rep(`/* Portraits added after the original media upload carry id 0 above. Look them
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

`, '', 'remove late resolve');

rep(`const SERIF='Newsreader', SANS='Poppins';`,
`const SERIF='Newsreader', SANS='Poppins';

/* Resolve attachment IDs before anything is built. This has to happen above the
   page definitions: they capture MEDIA values as they are defined, so resolving
   later left an unresolved entry rendering a 404 URL. */
for (const [key, v] of Object.entries(MEDIA).filter(([, v]) => v[0] === 0)) {
  const slug = v[1].replace(/\\.[a-z]+$/i, '');
  const r = await fetch('/wp-json/wp/v2/media?per_page=5&search=' + encodeURIComponent(slug), {credentials:'same-origin'}).catch(() => null);
  const j = r ? await r.json().catch(() => []) : [];
  const hit = Array.isArray(j) ? j.find(m => (m.source_url || '').includes(v[1])) : null;
  if (hit) MEDIA[key][0] = hit.id;
}
const HAS = k => MEDIA[k] && MEDIA[k][0] !== 0;
const missingRequired = Object.entries(MEDIA).filter(([, v]) => v[0] === 0 && !v[2]).map(([, v]) => v[1]);
if (missingRequired.length) return 'Upload these to the media library first, then run again: ' + missingRequired.join(', ');
const missingOptional = Object.entries(MEDIA).filter(([, v]) => v[0] === 0 && v[2]).map(([, v]) => v[1]);`,
  'early resolve');

/* ---- 3. the section itself ---- */
rep(`  S({bg:P, pt:112, pb:112, gap:40}, [
    Row({gap:48, align:'center'}, [
      Col(34, {gap:16}, [EB('Partners and strategic alliances'), H('The institutions we work alongside.', 'h2', 36, {m:26})]),
      Row({gap:40, align:'center', s:{width:pct(60), width_mobile:pct(100), flex_direction_mobile:'row'}}, [
        Col(30, {gap:14, s:{flex_align_items:'center'}}, [PLOGO('ffi', 90), T('<p>Family Firm Institute</p>', {size:13, c:M, align:'center'})]),
        Col(30, {gap:14, s:{flex_align_items:'center'}}, [PLOGO('uap', 90), T('<p>University of Asia and the Pacific</p>', {size:13, c:M, align:'center'})]),
        Col(30, {gap:14, s:{flex_align_items:'center'}}, [PLOGO('fbn', 90), T('<p>Family Business Network Asia</p>', {size:13, c:M, align:'center'})])
      ])
    ])
  ]),`,
`  PARTNERSECTION(),`, 'partners section');

rep(`const VALUE = (name, desc) =>`,
`/* A logo tile, rendered only when its file is in the media library. */
const PTILE = (k, label) => HAS(k) ? Col(15.5, {gap:10, s:{width_mobile:pct(30), flex_align_items:'center'}}, [
  PLOGO(k, 62),
  T('<p>' + label + '</p>', {size:11.5, lh:1.4, c:M, align:'center'})
]) : null;

const PARTNERGROUP = (title, lead, tiles) => {
  const shown = tiles.filter(Boolean);
  return shown.length ? S({pt:0, pb:96, pbm:56, gap:40}, [
    Row({gap:48, align:'flex-end'}, [
      Col(48, {gap:14}, [EB(title), H(lead, 'h2', 34, {m:26})]),
      Col(44, {gap:0}, [])
    ]),
    Row({gap:28, rgap:40, wrap:true, s:{flex_direction_mobile:'row'}}, shown)
  ]) : null;
};

/* The split is a reading of the logo sheet, not Premier's own grouping:
   institutes and universities as alliances, chambers and financial
   institutions as affiliates. Worth confirming. */
const PARTNERSECTION = () => S({bg:P, pt:112, pb:40, ptm:64, gap:0}, [
  PARTNERGROUP('Partnerships and strategic alliances', 'The institutions we work alongside.', [
    PTILE('ffi', 'Family Firm Institute'),
    PTILE('fbn', 'Family Business Network Asia'),
    PTILE('uap', 'University of Asia and the Pacific'),
    PTILE('cfbe', 'Center for Family Business Excellence'),
    PTILE('strathmore', 'Strathmore University Dispute Resolution Centre'),
    PTILE('ateneo', 'Ateneo de Manila Graduate School of Business'),
    PTILE('usjr', 'University of San Jose-Recoletos'),
    PTILE('xavier', 'Xavier School')
  ].filter(Boolean)),
  PARTNERGROUP('Affiliates', 'Chambers and institutions we work with across the country.', [
    PTILE('ccci', 'Cebu Chamber of Commerce and Industry'),
    PTILE('mcci', 'Mandaue Chamber of Commerce and Industry'),
    PTILE('pccitarlac', 'PCCI Tarlac'),
    PTILE('pcciparanaque', 'PCCI Para&ntilde;aque'),
    PTILE('orcham', 'ORCHAM Leyte'),
    PTILE('inlife', 'Insular Life'),
    PTILE('sunlife', 'Sun Life'),
    PTILE('rcbc', 'RCBC'),
    PTILE('chinabank', 'Chinabank')
  ].filter(Boolean))
].filter(Boolean));

const VALUE = (name, desc) =>`, 'partner helpers');

/* Report which logos were skipped, so it is visible rather than silent. */
rep(`  out.push(pid + ':' + (ok ? 'ok' : 'FAIL ' + t.slice(0, 160)));
}`,
`  out.push(pid + ':' + (ok ? 'ok' : 'FAIL ' + t.slice(0, 160)));
}
if (missingOptional.length) out.push('\\nlogos not yet uploaded, left out: ' + missingOptional.join(', '));`,
  'report skipped');

if (Math.abs(s.length - before) > 6000) throw new Error(`size moved by ${s.length - before}; refusing to write`);
fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v20.txt', s);
new Function('return ' + s);
const pagesBlock = (s.match(/const PAGES = \[[\s\S]*?\];/) || [''])[0];
console.log('ok, bytes', s.length, '| pages:', (pagesBlock.match(/\[\d+,'/g) || []).length);
