/**
 * v24 — a scroll cue under the hero.
 *
 * A quiet chevron at the foot of the hero that scrolls to the next section.
 * Site-wide back-to-top lives in the Theme Builder footer instead, so it
 * reaches every page without touching seventeen of them.
 *
 * Honours prefers-reduced-motion: the bounce stops and the scroll is instant
 * for anyone who has asked for less movement.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const before = s.length;
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

rep(`      Col(44, {gap:0}, [IMG('family', 640, {hm:420})])
    ])
  ]),`,
`      Col(44, {gap:0}, [IMG('family', 640, {hm:420})])
    ]),
    SCROLLCUE()
  ]),`, 'hero cue');

rep(`const CIRCLESCSS = () =>`,
`/* The hero's scroll cue. Square-cornered and understated, in keeping with the
   rest of the buttons, rather than a floating circle. */
const SCROLLCUE = () => Wd('html', {html:\`<style>
.pfb-cue{display:flex;justify-content:center;margin-top:18px}
.pfb-cue__btn{display:inline-flex;flex-direction:column;align-items:center;gap:9px;
  background:none;border:0;cursor:pointer;padding:10px 14px;
  font:600 11px/1 Poppins,sans-serif;letter-spacing:2.2px;text-transform:uppercase;color:#5F6674;
  transition:color .2s ease-out}
.pfb-cue__btn:hover{color:#193153}
.pfb-cue__btn svg{display:block;animation:pfb-nudge 2.4s ease-in-out infinite}
.pfb-cue__btn:hover svg{animation-play-state:paused}
.pfb-cue__btn:focus-visible{outline:2px solid #193153;outline-offset:4px}
@keyframes pfb-nudge{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
@media(prefers-reduced-motion:reduce){.pfb-cue__btn svg{animation:none}}
@media(max-width:767px){.pfb-cue{display:none}}
</style>
<div class="pfb-cue">
<button type="button" class="pfb-cue__btn" aria-label="Scroll to the next section">
  <span>Scroll</span>
  <svg width="22" height="13" viewBox="0 0 22 13" fill="none" aria-hidden="true">
    <path d="M1 1L11 11L21 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/>
  </svg>
</button>
</div>
<script>
(function(){
  var b=document.currentScript.parentNode.querySelector('.pfb-cue__btn'); if(!b) return;
  b.addEventListener('click',function(){
    // The hero is a top-level section; step to whatever follows it.
    var sec=b.closest('.e-con,section'); while(sec&&sec.parentNode&&!sec.nextElementSibling) sec=sec.parentNode;
    var next=sec&&sec.nextElementSibling;
    var quiet=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(next) next.scrollIntoView({behavior:quiet?'auto':'smooth',block:'start'});
    else window.scrollBy({top:window.innerHeight*0.85,behavior:quiet?'auto':'smooth'});
  });
})();
</script>\`});

const CIRCLESCSS = () =>`, 'cue helper');

if (Math.abs(s.length - before) > 2600) throw new Error(`size moved by ${s.length - before}`);
fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v24.txt', s);
new Function('return ' + s);
const pb = (s.match(/const PAGES = \[[\s\S]*?\];/) || [''])[0];
console.log('ok, bytes', s.length, '| pages:', (pb.match(/\[\d+,'/g) || []).length);
