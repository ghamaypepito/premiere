// Extract clean article bodies from the old site's rendered BeTheme pages.
const fs = require('fs');
const path = require('path');

const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'br', 'a']);
const decode = s => s.replace(/&nbsp;/g, ' ');

function clean(html) {
  html = html.replace(/<(script|style|noscript|svg|iframe|form|button)[\s\S]*?<\/\1>/gi, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<img[^>]*>/gi, '');
  // map h1/h5/h6 to h2/h4, then strip every tag not allowed, keeping href on links
  html = html.replace(/<(\/?)h1\b/gi, '<$1h2').replace(/<(\/?)h[56]\b/gi, '<$1h4');
  html = html.replace(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi, (m, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED.has(tag)) return tag === 'div' || tag === 'section' ? '\n' : '';
    if (tag === 'a' && !slash) {
      const href = (attrs.match(/href="([^"]+)"/) || [])[1];
      if (!href || /^#|javascript:/.test(href)) return '';
      const external = !/premierfamilybusiness\.com/.test(href);
      return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>';
    }
    return '<' + slash + tag + '>';
  });
  html = html.replace(/<a>|<\/a>(?=[^<]*<\/a>)/g, '');
  // drop empty elements and collapse whitespace
  for (let i = 0; i < 3; i++) html = html.replace(/<(p|h2|h3|h4|li|strong|em|b|i)>\s*<\/\1>/g, '');
  html = html.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  return decode(html);
}

const out = [];
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.html'))) {
  const raw = fs.readFileSync(path.join(__dirname, f), 'utf8');
  const start = raw.indexOf('mfn-builder-content');
  let end = raw.indexOf('mfn-share-post', start);
  if (end < 0) end = raw.indexOf('Ready to Talk', start);
  let body = clean(raw.slice(raw.indexOf('>', start) + 1, end));
  body = body.replace(/<p>\s*(Copy link|Share)\s*<\/p>/gi, '');
  const byline = (body.match(/<p>\s*(?:<strong>)?\s*by ([^<]+?)\s*(?:<\/strong>)?\s*<\/p>/i) || [])[1] || '';
  const title = ((raw.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  out.push({ slug: f.replace(/\.html$/, ''), title, byline, words: text.split(' ').length, excerpt: text.slice(0, 220), body });
}
fs.writeFileSync(path.join(__dirname, 'articles.json'), JSON.stringify(out, null, 1));
for (const a of out) console.log(a.slug.slice(0, 40), '|', a.words, 'words |', a.byline, '|', a.title.slice(0, 60));
