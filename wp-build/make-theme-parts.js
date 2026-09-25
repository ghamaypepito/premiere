/**
 * Generates premier-theme-parts.txt from premier-elementor-build.txt.
 *
 * The footer in the Theme Builder template must stay identical to the one the
 * pages used, so rather than copying it by hand we slice the shared prelude
 * (helpers, MEDIA, LINK, SOCIAL, BOOKING, FOOTER) straight out of the build
 * script and append the header template and the save routine.
 */
const fs = require('fs');

const build = fs.readFileSync('premier-elementor-build.txt', 'utf8');

const end = build.indexOf('const CTA = (title, text,');
if (end < 0) throw new Error('CTA marker missing — prelude boundary moved');

const prelude = build.slice(0, end);

for (const needed of ['const FOOTER =', 'const BOOKING =', 'const SOCIAL =', 'const LOGO =', 'const BTN =']) {
  if (!prelude.includes(needed)) throw new Error('prelude is missing ' + needed);
}

const tail = `
/* ---------- header ---------- */
/* Solid navy on every page. The prototype's transparent-over-hero treatment is
   available by setting this to true, but it has not been previewed against the
   live pages, so it ships off. */
const HOME_TRANSPARENT = false;

const NAVMENU = () => Wd('nav-menu', Object.assign({
    menu: window.__pfbMenu || '',
    layout:'horizontal', align_items:'center',
    pointer:'underline', animation_line:'fade',
    color_menu_item:W, color_menu_item_hover:G, pointer_color_menu_item_hover:G,
    color_menu_item_active:G, pointer_color_menu_item_active:G,
    space_between:{unit:'px', size:26},
    padding_horizontal_menu_item:{unit:'px', size:0},
    padding_vertical_menu_item:{unit:'px', size:8},
    toggle:'burger', toggle_size:{unit:'px', size:20},
    toggle_color:W, toggle_color_hover:G,
    color_menu_item_dropdown:W, background_color_dropdown:N,
    color_menu_item_hover_dropdown:N, background_color_hover_dropdown:G,
    dropdown_divider_width:{unit:'px', size:0},
    padding_horizontal_dropdown_item:{unit:'px', size:22},
    padding_vertical_dropdown_item:{unit:'px', size:14},
    _css_classes:'pfb-nav'
  },
  Object.keys(typo(SANS, 15, {w:'500'})).reduce((o, k) => {
    o[k.replace('typography_', 'menu_typography_')] = typo(SANS, 14.5, {w:'500', lh:1.4})[k];
    return o;
  }, {}),
  Object.keys(typo(SANS, 15, {w:'500'})).reduce((o, k) => {
    o[k.replace('typography_', 'dropdown_typography_')] = typo(SANS, 14, {w:'500', lh:1.5})[k];
    return o;
  }, {})));

const HEADERCSS = () => Wd('html', {html:\`<style>
.pfb-header{transition:background-color .28s ease-out,backdrop-filter .28s ease-out,border-color .28s ease-out;border-bottom:1px solid rgba(143,166,201,0)}
.pfb-header.pfb-solid{border-bottom-color:rgba(143,166,201,.18)}
.pfb-nav .elementor-item{letter-spacing:.1px}
.pfb-nav .elementor-nav-menu--dropdown a{border-radius:0}
.pfb-header .elementor-button{border-radius:0}
@media(max-width:1024px){.pfb-header .pfb-headcta{display:none}}
\${HOME_TRANSPARENT ? \`
body.home .pfb-header{background-color:rgba(25,49,83,0)!important}
body.home .pfb-header.pfb-solid{background-color:rgba(25,49,83,.94)!important;backdrop-filter:blur(10px)}\` : ''}
</style>
<script>
(function(){
  var h=document.querySelector('.pfb-header'); if(!h) return;
  var tick=function(){ h.classList.toggle('pfb-solid', window.scrollY>24); };
  tick(); window.addEventListener('scroll', tick, {passive:true});
})();
</script>\`});

const HEADER = () => C({
    content_width:'boxed', boxed_width:px(1200), flex_direction:'row',
    flex_align_items:'center', flex_justify_content:'space-between', flex_wrap:'nowrap',
    flex_gap:gp(32),
    padding:bx(18,24,18,24), padding_tablet:bx(14,32,14,32), padding_mobile:bx(12,22,12,22),
    background_background:'classic', background_color:N,
    sticky:'top', sticky_on:['desktop','tablet','mobile'], sticky_offset:0, z_index:60,
    css_classes:'pfb-header'
  }, [
    C({width:pct(24), width_mobile:pct(52), flex_direction:'row', flex_align_items:'center', flex_gap:gp(0),
       html_tag:'a', link:lnk(LINK.home)}, [LOGO('logow', 196)]),
    C({width:pct(72), width_mobile:pct(44), flex_direction:'row', flex_align_items:'center',
       flex_justify_content:'flex-end', flex_wrap:'nowrap', flex_gap:gp(28)}, [
      NAVMENU(),
      C({flex_direction:'row', flex_gap:gp(0), css_classes:'pfb-headcta'}, [
        BTN('Schedule a call', LINK.cal, 'p', {s:{text_padding:bx(13,22,13,22)}})
      ])
    ]),
    HEADERCSS()
  ], false);

/* ---------- find the two Theme Builder templates ---------- */
/* Matches on the template title first, then the type column. The previous
   version only looked for one markup pattern and returned null both when the
   templates were missing and when parsing failed, which made a real absence
   indistinguishable from a bad regex. */
const findTemplate = async (type) => {
  const override = type === 'header' ? window.__pfbHeaderId : window.__pfbFooterId;
  if (override) return override;

  const html = await (await fetch('/wp-admin/edit.php?post_type=elementor_library&posts_per_page=200',
    {credentials:'same-origin'})).text();
  const rows = [...html.matchAll(/<tr[^>]*\\sid=["\']post-(\\d+)["\'][\\s\\S]*?<\\/tr>/g)];

  const want = type === 'header' ? /premier\\s*header/i : /premier\\s*footer/i;
  const typeRe = new RegExp('>\\\\s*' + type + '\\\\s*<', 'i');

  for (const r of rows) {
    const title = (r[0].match(/class="row-title"[^>]*>([\\s\\S]*?)<\\/a>/) || [])[1] || '';
    if (want.test(title.replace(/<[^>]*>/g, ''))) return Number(r[1]);
  }
  for (const r of rows) {
    if (typeRe.test(r[0])) return Number(r[1]);
  }
  return null;
};

/* ---------- save ---------- */
const headerId = await findTemplate('header');
const footerId = await findTemplate('footer');

if (!headerId || !footerId) {
  return 'Create the templates first: Templates > Theme Builder > Header (and Footer) > Add New, '
    + 'name them "Premier Header" / "Premier Footer", set the display condition to Entire Site, save, '
    + 'then run this again. Found header=' + headerId + ' footer=' + footerId;
}

const ed = await (await fetch('/wp-admin/post.php?post=' + headerId + '&action=elementor', {credentials:'same-origin'})).text();
const nonce = (ed.match(/"ajax":\\{"url":"[^"]+","nonce":"([a-z0-9]+)"\\}/) || [])[1];
if (!nonce) return 'no nonce';

const TEMPLATES = [[headerId, 'Premier Header', [HEADER()]], [footerId, 'Premier Footer', [FOOTER()]]];
const out = [];

for (const [pid, title, elements] of TEMPLATES) {
  await fetch('/wp-admin/post.php?post=' + pid + '&action=elementor', {credentials:'same-origin'});
  const fd = new FormData();
  fd.append('action', 'elementor_ajax');
  fd.append('_nonce', nonce);
  fd.append('editor_post_id', pid);
  fd.append('initial_document_id', pid);
  fd.append('actions', JSON.stringify({save_builder:{action:'save_builder', data:{status:'publish', elements, settings:{post_title:title, post_status:'publish'}}}}));
  const r = await fetch('/wp-admin/admin-ajax.php', {method:'POST', body:fd, credentials:'same-origin'});
  const t = await r.text();
  let ok = false; try { const j = JSON.parse(t); ok = j.success && j.data.responses.save_builder.success; } catch (e) {}
  out.push(title + ' (' + pid + '): ' + (ok ? 'ok' : 'FAIL ' + t.slice(0, 160)));
}

return out.join(' | ');
})()
  .then(r => console.log('%c' + r, 'font-size:13px;line-height:1.6'))
  .catch(e => console.error('SCRIPT FAILED:', e));
`;

const script = prelude + tail;
fs.writeFileSync('premier-theme-parts.txt', script);

new Function('return ' + script);
console.log('ok, bytes', script.length);
