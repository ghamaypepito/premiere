/**
 * v19 — slider polish and the home team row.
 *
 * 1. Hide the slider's scrollbar. Scroll-snap needs a scrollable element, but
 *    the bar itself is chrome the design does not want.
 * 2. Arrow buttons turn brand gold when hovered or pressed, rather than navy.
 * 3. The home team block becomes a row of circular portraits, per the deck's
 *    "Proposed Look" on p13. The heading, paragraph and link are kept — the
 *    deck asked for the words to stay.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* ---- 1 + 2. slider chrome ---- */
rep(`.pfb-slider__track{overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.pfb-slider__track::-webkit-scrollbar{height:5px}
.pfb-slider__track::-webkit-scrollbar-thumb{background:#DCE3EE;border-radius:0}`,
`.pfb-slider__track{overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none}
.pfb-slider__track::-webkit-scrollbar{display:none;width:0;height:0}`, 'hide scrollbar');

rep(`.pfb-slider__btn:hover{background:#193153;color:#fff}`,
    `.pfb-slider__btn:hover,.pfb-slider__btn:active,.pfb-slider__btn:focus-visible{background:#F2AF11;border-color:#F2AF11;color:#193153;outline:none}`,
    'gold arrows');
rep(`.pfb-slider__btn:hover:disabled{background:#fff;color:#193153}`,
    `.pfb-slider__btn:hover:disabled,.pfb-slider__btn:active:disabled{background:#fff;border-color:#193153;color:#193153}`,
    'disabled arrows');

/* ---- 3. home team as circular portraits ---- */
rep(`      Row({gap:24, rgap:32, wrap:true, s:{width:pct(58), width_mobile:pct(100), flex_direction_mobile:'row'}}, [
        PORTRAIT('jon', 'Jon Ramos', 'CEO and Founder', 47, 380),
        PORTRAIT('neil', 'Neil Arnold Montesclaros', 'Chief Operations Officer', 47, 380),
        PORTRAIT('jeff', 'Jefferson Tio', 'Chief Partnership and Relationship Officer', 47, 380),
        PORTRAIT('gen', 'Genevieve Ramos', 'Chief Finance Officer', 47, 380)
      ])`,
`      Row({gap:20, rgap:34, wrap:true, s:{width:pct(58), width_mobile:pct(100), flex_direction_mobile:'row', css_classes:'pfb-circles'}}, [
        CIRCLE('jon', 'Jon Ramos', 'CEO and Founder'),
        CIRCLE('neil', 'Neil Arnold Montesclaros', 'Chief Operations Officer'),
        CIRCLE('jeff', 'Jefferson Tio', 'Chief Partnership and Relationship Officer'),
        CIRCLE('gen', 'Genevieve Ramos', 'Chief Finance Officer')
      ])`, 'home team row');

rep(`const STEP = (n, title, desc, first, last) =>`,
`/* The deck's p13 "Proposed Look": circular portraits in a row rather than a
   grid of squares. The heading and paragraph beside them are kept, as asked. */
const CIRCLE = (k, name, role) => Col(23, {gap:12, s:{width_mobile:pct(47), flex_align_items:'center', css_classes:'pfb-circle'}}, [
  IMG(k, 150, {hm:130, pos:'top center', s:{width:px(150), width_mobile:px(130), border_radius:bx(999,999,999,999), align:'center'}}),
  H(name, 'h3', 17, {m:16, ls:0, lh:1.3, align:'center'}),
  T('<p>' + role + '</p>', {size:12.5, lh:1.5, c:M, align:'center'})
]);
const CIRCLESCSS = () => Wd('html', {html:\`<style>
.pfb-circles .pfb-circle img{border-radius:50%!important;aspect-ratio:1/1;object-fit:cover}
.pfb-circles .pfb-circle{text-align:center}
.pfb-circles .pfb-circle .elementor-widget-image{display:flex;justify-content:center}
/* Four across on desktop; Elementor's own widths let them wrap 3+1 otherwise. */
.pfb-circles{flex-wrap:nowrap!important}
.pfb-circles > .e-con,.pfb-circles > div{flex:1 1 0!important;min-width:0}
@media(max-width:767px){.pfb-circles{flex-wrap:wrap!important}.pfb-circles > .e-con,.pfb-circles > div{flex:0 0 47%!important}}
</style>\`});

const STEP = (n, title, desc, first, last) =>`, 'circle helper');

/* The stylesheet has to reach the page, so it rides with the section. */
rep(`        BTN('Meet the team', LINK.who, 'l')
      ]),`,
    `        BTN('Meet the team', LINK.who, 'l'),
        CIRCLESCSS()
      ]),`, 'circles css');

if (Math.abs(s.length - before) > 3000) throw new Error(`size moved by ${s.length - before}; refusing to write`);
fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v19.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
