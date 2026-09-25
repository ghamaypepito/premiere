/**
 * Renders the Elementor build to static HTML so the pages can be reviewed
 * without a WordPress install.
 *
 * The build script is one async IIFE: a prelude that declares every helper and
 * page, then a save section that talks to wp-admin. We slice off the save
 * section, evaluate the prelude in Node, and walk the element trees the page
 * definitions produce.
 *
 * This is a layout and copy preview, not a pixel-accurate render of Elementor's
 * output. Fonts, spacing and colours follow the same tokens; anything Elementor
 * computes at runtime (nav-menu, sticky header) is approximated.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const cut = src.indexOf('const only = window.__onlyPages;');
if (cut < 0) throw new Error('save boundary moved');

// Keep everything up to the save loop, then hand back what we want to render.
const body = src.slice(src.indexOf('{') + 1, cut) + '\n return {PAGES, MEDIA, U, FOOTER};';
const {PAGES, MEDIA, U, FOOTER} = new Function('window', body)({});

const esc = t => String(t).replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unit = v => v && typeof v === 'object' && v.size !== undefined && v.size !== '' ? v.size + (v.unit === 'custom' ? '' : v.unit) : null;
const box = v => v && v.top !== undefined ? [v.top, v.right, v.bottom, v.left].map(n => (n === '' ? 0 : n) + (v.unit || 'px')).join(' ') : null;

/* Local copies of the images so the preview works offline. */
const assetFor = url => {
  const file = String(url).replace(U, '');
  for (const dir of ['../assets/wp', '../assets/team/web', '../assets/team/v2', '../assets/partners/web', '../assets/light/web', 'legacy/crops', 'articles']) {
    const p = path.join(dir, file);
    // Paths are written into preview/*.html, so resolve them from there.
    if (fs.existsSync(p)) return path.relative('preview', p).replace(/\\/g, '/');
  }
  return null;
};

function css(s) {
  const d = [];
  const push = (k, v) => { if (v !== null && v !== undefined && v !== '') d.push(k + ':' + v); };
  push('padding', box(s.padding));
  push('gap', s.flex_gap && (unit(s.flex_gap) || (s.flex_gap.column || 0) + 'px'));
  push('width', s.width ? unit(s.width) : null);
  push('max-width', s.boxed_width ? unit(s.boxed_width) : null);
  push('margin', s.boxed_width ? '0 auto' : box(s.margin));
  if (s.background_background === 'classic') push('background', s.background_color);
  if (s.border_border === 'solid') { push('border-style', 'solid'); push('border-width', box(s.border_width)); push('border-color', s.border_color); }
  push('border-radius', box(s.border_radius));
  push('color', s.title_color || s.text_color);
  push('text-align', s.align);
  if (s.typography_typography === 'custom') {
    push('font-family', s.typography_font_family ? `"${s.typography_font_family}", Georgia, serif` : null);
    push('font-size', unit(s.typography_font_size));
    push('font-weight', s.typography_font_weight);
    push('line-height', unit(s.typography_line_height));
    push('letter-spacing', unit(s.typography_letter_spacing));
    push('text-transform', s.typography_text_transform);
  }
  return d.join(';');
}

function render(el) {
  const s = el.settings || {};
  if (el.elType === 'container') {
    const flex = [
      'display:flex',
      'flex-direction:' + (s.flex_direction || 'column'),
      s.flex_align_items ? 'align-items:' + s.flex_align_items : '',
      s.flex_justify_content ? 'justify-content:' + s.flex_justify_content : '',
      s.flex_wrap ? 'flex-wrap:' + s.flex_wrap : '',
      s.width ? '' : 'width:100%'
    ].filter(Boolean).join(';');
    const inner = (el.elements || []).map(render).join('');
    const cls = s.css_classes ? ` class="${s.css_classes}"` : '';
    const kids = s.boxed_width
      ? `<div style="${flex};${css(s)}">${inner}</div>`
      : `<div${cls} style="${flex};${css(s)}">${inner}</div>`;
    // A boxed container is a full-bleed band with a centred column inside.
    if (s.boxed_width) {
      const band = [s.background_background === 'classic' ? 'background:' + s.background_color : '', 'width:100%'].filter(Boolean).join(';');
      return `<section${cls} style="${band}">${kids}</section>`;
    }
    return kids;
  }

  const w = el.widgetType;
  if (w === 'heading') {
    const tag = /^h[1-6]$/.test(s.header_size) ? s.header_size : 'p';
    return `<${tag} style="margin:0;${css(s)}">${s.title}</${tag}>`;
  }
  if (w === 'text-editor') return `<div style="${css(s)}" class="rt">${s.editor}</div>`;
  if (w === 'button') {
    const bg = s.button_background_color && s.button_background_color !== 'rgba(0,0,0,0)' ? s.button_background_color : 'transparent';
    const bd = s.border_border === 'solid' ? `border:${box(s.border_width)} solid ${s.border_color};` : 'border:0;';
    return `<a href="${(s.link && s.link.url) || '#'}" style="display:inline-block;text-decoration:none;background:${bg};color:${s.button_text_color};padding:${box(s.text_padding) || '16px 28px'};${bd}${css(s)}">${s.text}</a>`;
  }
  if (w === 'image') {
    const local = assetFor(s.image && s.image.url);
    const h = unit(s.height);
    const style = [ s.width ? 'width:' + unit(s.width) : 'width:100%', h ? 'height:' + h : '', 'object-fit:' + (s['object-fit'] || 'cover'), 'display:block' ].filter(Boolean).join(';');
    return local ? `<img src="${local}" alt="" style="${style}">`
                 : `<div style="${style};background:#E6E2D9;display:grid;place-items:center;color:#5F6674;font:12px Poppins,sans-serif">image</div>`;
  }
  if (w === 'video') {
    const id = String(s.youtube_url || '').split('/').pop().split('?')[0].replace('watch?v=', '');
    return `<div style="aspect-ratio:${s.aspect_ratio === '916' ? '9/16' : '16/9'};background:#193153;color:#fff;display:grid;place-items:center;font:13px Poppins,sans-serif;text-align:center;padding:16px">YouTube<br>${esc(id)}</div>`;
  }
  if (w === 'divider') return `<hr style="border:0;border-top:${unit(s.weight) || '1px'} solid ${s.color};margin:0;width:100%">`;
  if (w === 'spacer') return `<div style="height:${unit(s.space) || '20px'}"></div>`;
  if (w === 'social-icons') return `<div style="display:flex;gap:10px">${(s.social_icon_list || []).map(() => `<span style="width:34px;height:34px;border-radius:50%;background:${s.icon_primary_color};display:inline-block"></span>`).join('')}</div>`;
  if (w === 'nav-menu') return `<nav style="display:flex;gap:26px;font:500 14.5px Poppins,sans-serif;color:#fff">${['Who we are','What we do','Events','Resources','FAQs'].map(t => `<span>${t}</span>`).join('')}</nav>`;
  if (w === 'html') {
    // Keep the markup, drop only the scripts. Dropping the whole widget hid
    // the booking dialog, which is markup plus a script in one block.
    return (s.html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  }
  return '';
}

const SHELL = (title, inner, nav) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300..700;1,300..700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font:400 17px/1.7 Poppins,system-ui,sans-serif;color:#3E4756;background:#fff}
img{max-width:100%}.rt p{margin:0 0 .9em}.rt p:last-child{margin-bottom:0}
.rt a{color:inherit}.pfb-bar{position:sticky;top:0;z-index:99;background:#0F2340;color:#fff;padding:10px 18px;font:500 13px Poppins,sans-serif;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.pfb-bar a{color:#F2AF11;text-decoration:none}.pfb-bar a:hover{text-decoration:underline}
.pfb-bar b{color:#fff;font-weight:600}
@media(max-width:900px){section>div{flex-direction:column!important}section>div>div{width:100%!important}}
</style></head><body>
<div class="pfb-bar"><b>Preview — ${esc(title)}</b>${nav}</div>
${inner}
</body></html>`;

fs.mkdirSync('preview', {recursive: true});
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nav = PAGES.map(([, t]) => `<a href="${slug(t)}.html">${esc(t)}</a>`).join('');

let n = 0;
for (const [id, title, elements] of PAGES) {
  // The build appends the footer at save time, so the preview must too.
  const html = [...elements.filter(Boolean), FOOTER()].map(render).join('');
  fs.writeFileSync(path.join('preview', slug(title) + '.html'), SHELL(title + ' (post ' + id + ')', html, nav));
  n++;
}
fs.writeFileSync(path.join('preview', 'index.html'), SHELL('All pages',
  `<div style="max-width:760px;margin:0 auto;padding:56px 24px">
   <h1 style="font:400 44px/1.1 Newsreader,Georgia,serif;color:#193153">Premier — page preview</h1>
   <p>Static render of the Elementor build, for review before publishing. Layout and copy are accurate; Elementor's runtime pieces (menu, sticky header, pop-up) are approximated.</p>
   <ul style="line-height:2.2;padding-left:18px">${PAGES.map(([id, t]) => `<li><a href="${slug(t)}.html" style="color:#193153">${esc(t)}</a> <span style="color:#5F6674;font-size:13px">post ${id}</span></li>`).join('')}</ul></div>`, ''));

console.log('rendered', n, 'pages into wp-build/preview/');
