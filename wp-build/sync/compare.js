/**
 * Compare what WordPress actually holds against what the build would produce.
 *
 *   node wp-build/sync/compare.js
 *
 * Reads the JSON pulled by pull-elementor.sh from wp-build/sync/pulled/ and
 * diffs it against the element trees the build script generates.
 *
 * Element ids are random on every generate, and Elementor adds its own keys on
 * save, so a deep equality check would report every page as changed. Instead
 * each tree is reduced to a content fingerprint — the ordered sequence of
 * element types and the text they carry — which catches copy edits, added or
 * removed sections and reordering, while ignoring churn that means nothing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PULLED = path.join(__dirname, 'pulled');

/* ---- what the build would publish ---- */
async function generated() {
  const src = fs.readFileSync(path.join(ROOT, 'premier-elementor-build.txt'), 'utf8');
  const cut = src.indexOf('const only = window.__onlyPages;');
  if (cut < 0) throw new Error('save boundary moved in the build script');

  let body = src.slice(src.indexOf('{') + 1, cut);
  body = body.replace(/if \(missingRequired\.length\) return [^;]+;/, '');
  body += '\n return {PAGES, FOOTER, FOOTER_ON_PAGES};';

  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const stub = async () => ({json: async () => []});
  const {PAGES, FOOTER, FOOTER_ON_PAGES} = await new AsyncFunction('window', 'fetch', body)({}, stub);

  const out = new Map();
  for (const [id, title, elements] of PAGES) {
    const els = elements.filter(Boolean);
    out.set(String(id), {title, elements: FOOTER_ON_PAGES ? [...els, FOOTER()] : els});
  }
  return out;
}

/* ---- reduce a tree to comparable content ---- */
const TEXT_KEYS = ['title', 'editor', 'text', 'html'];

function fingerprint(nodes, depth = 0, acc = []) {
  for (const n of nodes || []) {
    if (!n) continue;
    const kind = n.elType === 'widget' ? `widget:${n.widgetType}` : 'container';
    const s = n.settings || {};
    let txt = '';
    for (const k of TEXT_KEYS) {
      if (typeof s[k] === 'string' && s[k].trim()) { txt = s[k]; break; }
    }
    txt = txt.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 110);
    acc.push(`${'  '.repeat(depth)}${kind}${txt ? ' | ' + txt : ''}`);
    fingerprint(n.elements, depth + 1, acc);
  }
  return acc;
}

/* ---- report ---- */
(async () => {
  if (!fs.existsSync(PULLED)) {
    console.error('No pulled data. Run sync/pull-elementor.sh on the server, then unpack');
    console.error('its pfb-export/ contents into ' + path.relative(process.cwd(), PULLED));
    process.exit(1);
  }

  const manifestPath = path.join(PULLED, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const gen = await generated();

  let drifted = 0, matched = 0, unknown = 0;

  for (const file of fs.readdirSync(PULLED).filter(f => f.endsWith('.json') && f !== 'manifest.json')) {
    const id = (file.match(/-(\d+)-/) || [])[1];
    const meta = manifest[id] || {};
    const live = JSON.parse(fs.readFileSync(path.join(PULLED, file), 'utf8'));
    const mine = gen.get(id);

    if (!mine) {
      unknown++;
      console.log(`\n?  ${file}  (${meta.title || 'unknown'})`);
      console.log('   not produced by the build — a template, or a page someone added.');
      continue;
    }

    const a = fingerprint(mine.elements);
    const b = fingerprint(live);

    if (a.join('\n') === b.join('\n')) { matched++; continue; }

    drifted++;
    console.log(`\nCHANGED  ${id}  ${mine.title}   (last modified ${meta.modified || '?'})`);
    const max = Math.max(a.length, b.length);
    let shown = 0;
    for (let i = 0; i < max && shown < 12; i++) {
      if (a[i] === b[i]) continue;
      shown++;
      console.log(`   build: ${a[i] ?? '(nothing)'}`);
      console.log(`   live : ${b[i] ?? '(nothing)'}`);
    }
    if (shown === 12) console.log('   ... more differences not shown');
  }

  console.log(`\n${matched} unchanged, ${drifted} changed in WordPress, ${unknown} not from the build`);
  if (drifted) {
    console.log('\nA changed page means someone edited it in Elementor. Republishing the build');
    console.log('would overwrite that edit — port it into the build script first.');
  }
})();
