/**
 * Build sync/pulled/ from a WordPress export (WXR) instead of the SSH pull.
 *
 *   node wp-build/sync/from-wxr.js <export.xml>
 *
 * Tools > Export in wp-admin produces a WXR file, and post meta rides along in
 * it — which means _elementor_data is in there. Same data pull-elementor.sh
 * fetches over SSH, no terminal required.
 *
 * Parsed with a real XML parser rather than regex: meta values are CDATA, and
 * Elementor JSON contains ]]> sequences that WordPress escapes by splitting the
 * CDATA section. A regex would silently truncate those pages.
 */
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const src = process.argv[2];
if (!src) { console.error('usage: node from-wxr.js <export.xml>'); process.exit(1); }

const OUT = path.join(__dirname, 'pulled');
fs.mkdirSync(OUT, {recursive: true});

const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata',
  processEntities: true,
  parseTagValue: false,
  // Keep these as arrays even when a post has exactly one.
  isArray: name => ['item', 'wp:postmeta'].includes(name)
});

const doc = parser.parse(fs.readFileSync(src, 'utf8'));
const items = doc?.rss?.channel?.item || [];

const text = v => (v && typeof v === 'object' ? (v.__cdata ?? v['#text'] ?? '') : (v ?? '')) + '';

const manifest = {};
let written = 0, skipped = 0;

for (const item of items) {
  const type = text(item['wp:post_type']);
  if (type !== 'page' && type !== 'elementor_library') continue;

  const metas = item['wp:postmeta'] || [];
  const hit = metas.find(m => text(m['wp:meta_key']) === '_elementor_data');
  if (!hit) { skipped++; continue; }

  const raw = text(hit['wp:meta_value']);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { console.error(`  ! ${text(item.title)}: _elementor_data is not valid JSON (${e.message})`); continue; }

  const id = text(item['wp:post_id']);
  const slug = text(item['wp:post_name']) || 'untitled';
  fs.writeFileSync(path.join(OUT, `${type}-${id}-${slug}.json`), JSON.stringify(parsed));
  manifest[id] = {
    type, slug,
    title: text(item.title),
    modified: text(item['wp:post_modified']) || text(item['wp:post_date'])
  };
  written++;
  console.log(`  ${type.padEnd(18)} ${String(id).padStart(4)}  ${slug}`);
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`\n${written} Elementor documents written, ${skipped} posts had none.`);
