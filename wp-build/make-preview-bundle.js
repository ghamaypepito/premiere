/**
 * Flatten the preview into a self-contained directory that can be hosted.
 *
 *   node wp-build/make-preview-bundle.js
 *
 * make-preview.js writes pages that reach up out of preview/ for images
 * (../../assets/team/web/..., ../legacy/crops/...). That works fine opening the
 * files locally, but nothing above the root can be published or zipped.
 *
 * This copies every referenced file into preview-bundle/_assets/ and rewrites
 * the pages to point at it, so the result can be sent to a client, uploaded, or
 * published as a link without anything missing.
 *
 * Run make-preview.js first; this reads what that wrote.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'preview');
const OUT = path.join(__dirname, 'preview-bundle');

if (!fs.existsSync(SRC)) { console.error('No preview/. Run make-preview.js first.'); process.exit(1); }

fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(path.join(OUT, '_assets'), {recursive: true});

/* _live/ already sits inside preview/ and is referenced relatively, so it can
   be copied across untouched. */
if (fs.existsSync(path.join(SRC, '_live'))) {
  fs.cpSync(path.join(SRC, '_live'), path.join(OUT, '_live'), {recursive: true});
}

const pages = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
const copied = new Map();
let missing = 0;

/* Two files in different source directories can share a basename, so the
   flattened name keeps a slug of the directory to stay unique. */
function flatten(ref, pageFile) {
  if (copied.has(ref)) return copied.get(ref);
  const abs = path.resolve(SRC, ref);
  if (!fs.existsSync(abs)) {
    console.warn(`  missing: ${ref}  (from ${pageFile})`);
    missing++;
    copied.set(ref, null);
    return null;
  }
  const dir = path.dirname(ref).replace(/\.\.\//g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const name = (dir ? dir + '__' : '') + path.basename(ref);
  fs.copyFileSync(abs, path.join(OUT, '_assets', name));
  const rel = '_assets/' + name;
  copied.set(ref, rel);
  return rel;
}

for (const file of pages) {
  let html = fs.readFileSync(path.join(SRC, file), 'utf8');
  const refs = [...new Set(
    [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
      .filter(u => u.startsWith('../'))
  )];
  for (const ref of refs) {
    const rel = flatten(ref, file);
    if (rel) html = html.split(`"${ref}"`).join(`"${rel}"`);
  }
  /* srcset carries several URLs in one attribute, comma separated. */
  html = html.replace(/srcset="([^"]+)"/g, (m, set) => {
    const out = set.split(',').map(part => {
      const [u, d] = part.trim().split(/\s+/);
      if (!u || !u.startsWith('../')) return part.trim();
      const rel = flatten(u, file);
      return rel ? (d ? `${rel} ${d}` : rel) : part.trim();
    });
    return `srcset="${out.join(', ')}"`;
  });
  fs.writeFileSync(path.join(OUT, file), html);
}

const bytes = (function size(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).reduce((n, e) => {
    const p = path.join(dir, e.name);
    return n + (e.isDirectory() ? size(p) : fs.statSync(p).size);
  }, 0);
})(OUT);

console.log(`${pages.length} pages, ${[...copied.values()].filter(Boolean).length} assets flattened` +
            (missing ? `, ${missing} missing` : '') +
            ` — ${(bytes / 1048576).toFixed(1)} MB in wp-build/preview-bundle/`);
