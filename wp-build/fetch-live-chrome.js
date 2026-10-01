/**
 * Caches the live site's chrome so the local preview looks like the real thing.
 *
 *   node wp-build/fetch-live-chrome.js
 *
 * The preview used to render the element trees against a hand-written
 * stylesheet, which was fine for checking copy and layout but looked nothing
 * like the site. This pulls the real article: Elementor's frontend CSS, the
 * theme's CSS, the kit with the global colours and fonts, and the actual header
 * and footer markup the Theme Builder emits.
 *
 * Everything lands in preview/_live/ and is rewritten to paths relative to
 * preview/, where the rendered pages sit, so the preview still opens offline
 * from a file:// URL afterwards.
 *
 * Re-run it after publishing the header or footer, or after changing the kit.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE = (process.env.WP_URL || 'https://white-cassowary-123006.hostingersite.com').replace(/\/$/, '');
const OUT = path.join(__dirname, 'preview', '_live');

const get = url => new Promise((resolve, reject) => {
  const req = https.get(url, {timeout: 45000}, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return resolve(get(new URL(res.headers.location, url).href));
    }
    if (res.statusCode !== 200) { res.resume(); return reject(new Error(`${res.statusCode} ${url}`)); }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve(Buffer.concat(chunks)));
  });
  req.on('timeout', () => req.destroy(new Error('timeout ' + url)));
  req.on('error', reject);
});

/* A stylesheet's url() references are relative to the stylesheet, not the page,
   so each one is resolved against its own href before being rewritten. */
async function fetchAsset(url, seen) {
  const clean = url.split('#')[0];
  const rel = decodeURIComponent(new URL(clean).pathname).replace(/^\/+/, '');
  const dest = path.join(OUT, rel);
  if (seen.has(rel)) return rel;
  seen.add(rel);
  try {
    const buf = await get(clean);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    if (/\.css$/i.test(rel)) {
      let css = buf.toString('utf8');
      const refs = [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1])
        .filter(u => !u.startsWith('data:'));
      for (const ref of refs) {
        let abs;
        try { abs = new URL(ref, clean).href; } catch { continue; }
        if (!abs.startsWith(SITE)) continue;
        const sub = await fetchAsset(abs, seen);
        if (!sub) continue;
        // Back out of this stylesheet's own directory to _live/, then down.
        const back = path.relative(path.dirname(rel), sub).replace(/\\/g, '/');
        css = css.split(ref).join(back);
      }
      fs.writeFileSync(dest, css);
    } else {
      fs.writeFileSync(dest, buf);
    }
    return rel;
  } catch (e) {
    console.warn(`  skipped ${rel} (${e.message})`);
    seen.delete(rel);
    return null;
  }
}

(async () => {
  console.log(`Fetching chrome from ${SITE}`);
  const html = (await get(SITE + '/?cb=' + Date.now())).toString('utf8').replace(/&#0?38;/g, '&');

  fs.mkdirSync(OUT, {recursive: true});
  const seen = new Set();

  /* Stylesheets, in document order — order decides the cascade. */
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map(m => (m[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter(Boolean)
    .map(h => h.startsWith('//') ? 'https:' + h : h);

  const local = [];
  const remote = [];
  for (const href of sheets) {
    if (href.startsWith(SITE)) {
      const rel = await fetchAsset(href, seen);
      if (rel) local.push('_live/' + rel);
    } else {
      remote.push(href); // Google Fonts and the like stay as they are.
    }
  }
  console.log(`  ${local.length} stylesheets cached, ${remote.length} left remote`);

  /* Inline <style> blocks carry Elementor's per-page and kit rules. */
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(m => m[1]).filter(c => c.trim()).join('\n');

  /* The header and footer the Theme Builder emits. Elementor wraps each
     template in a data-elementor-type div, which is the reliable handle —
     <header>/<footer> tags vary by theme. */
  const grab = type => {
    const open = new RegExp(`<(div|header|footer)[^>]*data-elementor-type=["']${type}["'][^>]*>`, 'i');
    const m = html.match(open);
    if (!m) return '';
    // Walk tags from the match to find where this element closes.
    const tag = m[1];
    let i = m.index + m[0].length, depth = 1;
    const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
    re.lastIndex = i;
    let t;
    while ((t = re.exec(html))) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) return html.slice(m.index, t.index + t[0].length);
    }
    return '';
  };

  const header = grab('header');
  const footer = grab('footer');
  console.log(`  header ${header ? header.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  footer ${footer ? footer.length + ' chars' : 'NOT FOUND'}`);

  /* Rewrite absolute asset URLs in the chrome markup to the cached copies,
     fetching anything referenced that the stylesheets did not already pull. */
  const urls = [...new Set([...(header + footer).matchAll(
    new RegExp(SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/[^"\'\\s)]+?\\.(?:jpe?g|png|webp|svg|gif|woff2?)', 'gi')
  )].map(m => m[0]))];
  let chromeHtml = header + '\n' + footer;
  for (const u of urls) {
    const rel = await fetchAsset(u, seen);
    // Paths go in relative to preview/, where the pages live, not to _live/.
    if (rel) chromeHtml = chromeHtml.split(u).join('_live/' + rel);
  }
  const split = chromeHtml.indexOf('\n' + footer.slice(0, 40));
  const headerOut = footer ? chromeHtml.slice(0, split) : chromeHtml;
  const footerOut = footer ? chromeHtml.slice(split + 1) : '';

  fs.writeFileSync(path.join(OUT, 'chrome.json'), JSON.stringify({
    site: SITE,
    fetched: new Date().toISOString(),
    stylesheets: local,
    remoteStylesheets: remote,
    inlineCss: inline,
    header: headerOut,
    footer: footerOut
  }, null, 1));

  console.log(`\nCached into preview/_live/. Run make-preview.js to use it.`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
