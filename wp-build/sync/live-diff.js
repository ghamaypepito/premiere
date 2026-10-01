/**
 * Compare the live site against the local build, without an export.
 *
 *   node wp-build/sync/live-diff.js
 *   node wp-build/sync/live-diff.js --page home
 *
 * compare.js is the precise check, but it needs a WXR export the user has to
 * produce by hand. This one needs nothing: it fetches each published page,
 * strips it to visible text, and diffs that against the same page rendered
 * locally by make-preview.js.
 *
 * What it catches: copy edits, added or removed sections, reordering — the
 * things a client does in Elementor, and the things a republish would destroy.
 *
 * What it does not: styling, spacing, or anything invisible as text. For
 * porting an edit precisely, still take the export and run compare.js.
 *
 * Run make-preview.js first; this reads what that wrote.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = (process.env.WP_URL || 'https://white-cassowary-123006.hostingersite.com').replace(/\/$/, '');
const PREVIEW = path.join(__dirname, '..', 'preview');

const only = process.argv.includes('--page') ? process.argv[process.argv.indexOf('--page') + 1] : null;

const get = url => new Promise((resolve, reject) => {
  const req = https.get(url, {timeout: 45000}, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return resolve(get(new URL(res.headers.location, url).href));
    }
    if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
    const c = [];
    res.on('data', d => c.push(d));
    res.on('end', () => resolve(Buffer.concat(c).toString('utf8')));
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', reject);
});

/* Slice out just the page's own content, leaving the header and footer behind.
   They come from the Theme Builder, are identical everywhere, and would drown
   the real differences. Live wraps the content in data-elementor-type="wp-page";
   the local preview wraps it in .elementor-section-wrap. Walking the tags beats
   a regex here, because the wrapper is full of nested divs. */
function contentRegion(html) {
  const open = /<div[^>]*(?:data-elementor-type=["']wp-page["']|class=["'][^"']*elementor-section-wrap[^"']*["'])[^>]*>/i;
  const m = html.match(open);
  if (!m) return html;
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = m.index + m[0].length;
  let depth = 1, t;
  while ((t = re.exec(html))) {
    depth += t[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(m.index + m[0].length, t.index);
  }
  return html.slice(m.index + m[0].length);
}

/* Reduce a page to the words a reader sees. */
function visibleText(html) {
  let h = contentRegion(html);
  h = h.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  h = h.replace(/<[^>]+>/g, '\n');
  h = h.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&rsquo;|&#8217;/gi, '’')
       .replace(/&ldquo;|&#8220;/gi, '“').replace(/&rdquo;|&#8221;/gi, '”')
       .replace(/&mdash;|&#8212;/gi, '—').replace(/&ndash;|&#8211;/gi, '–')
       .replace(/&middot;/gi, '·').replace(/&rarr;/gi, '→')
       .replace(/&[a-z]+;/gi, ' ').replace(/&#\d+;/g, ' ');
  return h.split('\n').map(l => l.replace(/\s+/g, ' ').trim())
          /* WordPress runs wptexturize over published content, turning straight
             quotes and dashes into typographic ones. The build stores the
             straight forms, so without this every quoted line reads as changed
             and buries the differences that matter. */
          .map(l => l.replace(/[\u2018\u2019\u201a\u2032]/g, "'")
                     .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
                     .replace(/[\u2013\u2014]/g, '-')
                     .replace(/\u2026/g, '...'))
          .filter(l => l.length > 1)
          // The preview bar is local scaffolding, never on the live site.
          .filter(l => !/^Preview \u2014|^live chrome cached/.test(l))
          /* Known renderer differences, not content: the preview stubs YouTube
             embeds rather than loading them, and Elementor prints an icon's
             class name as its accessible label. */
          .filter(l => !/^(YouTube|watch|Play Video)$/i.test(l))
          .filter(l => !/^(Linkedin(-in)?|Facebook(-f)?|Youtube|Instagram|X-twitter|Twitter)$/i.test(l));
}

/* Longest common subsequence, so one inserted block does not report every
   line after it as changed. */
function diff(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({length: n + 1}, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(['live only', a[i++]]);
    else out.push(['build only', b[j++]]);
  }
  while (i < n) out.push(['live only', a[i++]]);
  while (j < m) out.push(['build only', b[j++]]);
  return out;
}

(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'premier-elementor-build.txt'), 'utf8');
  const block = src.match(/const PAGES = \[([\s\S]*?)\];/);
  if (!block) throw new Error('page list not found in the build');
  const pages = [...block[1].matchAll(/\[(\d+),\s*(["'])(.*?)\2/g)].map(m => [m[1], m[3]]);

  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  let clean = 0, drifted = 0, skipped = 0;
  for (const [id, title] of pages) {
    const s = slug(title);
    if (only && only !== s) continue;

    const localFile = path.join(PREVIEW, s + '.html');
    if (!fs.existsSync(localFile)) { console.log(`?  ${title} — no local render; run make-preview.js`); skipped++; continue; }

    let liveHtml;
    try { liveHtml = await get(`${SITE}/?page_id=${id}`); }
    catch (e) { console.log(`!  ${title} — could not fetch (${e.message})`); skipped++; continue; }

    const live = visibleText(liveHtml);
    const build = visibleText(fs.readFileSync(localFile, 'utf8'));
    const d = diff(live, build);

    if (!d.length) { clean++; continue; }
    drifted++;
    console.log(`\nDIFFERS  ${title}  (post ${id})`);
    for (const [side, line] of d.slice(0, 14)) {
      console.log(`   ${side === 'live only' ? 'live ' : 'build'}: ${line.slice(0, 120)}`);
    }
    if (d.length > 14) console.log(`   ... and ${d.length - 14} more lines`);
  }

  console.log(`\n${clean} match, ${drifted} differ, ${skipped} skipped`);
  if (drifted) {
    console.log('\n"live only" lines are on the site but not in the build — someone edited');
    console.log('in Elementor, and publishing would destroy it. Take an export and run');
    console.log('compare.js to port it precisely.');
    console.log('"build only" lines are changes waiting to be published.');
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
