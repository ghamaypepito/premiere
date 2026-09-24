/**
 * v11 — client edits from the Southside Studio mock-up, batch 1.
 *
 * Only the changes that need nothing from Premier. The two page renames
 * (Premier IDEA -> Key Process Management Consulting, PLI -> Building Effective
 * Governance) wait on their body copy; the slider, the team restructure and the
 * FAQ duplication land in v12.
 *
 * Decisions taken with the user:
 *  - eyebrows: only the two the deck marks, not all 57
 *  - FEP common questions: shown in both places, so FEP keeps its FAQPage schema
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};
const repAll = (a, b, label, n) => {
  const hits = s.split(a).length - 1;
  if (hits !== n) throw new Error(`${label}: expected ${n} hits, found ${hits}`);
  s = s.split(a).join(b);
};

/* ---- 1. "Schedule a call" becomes "Let's Talk about the Future" (p6, p24) ---- */
rep(`const G='#F2AF11'`, `const TALK = 'Let&rsquo;s Talk about the Future';\nconst G='#F2AF11'`, 'TALK const');
repAll(`BTN('Schedule a call'`, `BTN(TALK`, 'schedule buttons', 2);
rep(`const CTA = (title, text, btn = 'Schedule a call', url = btn === 'Schedule a call' ? LINK.cal : LINK.contact)`,
    `const CTA = (title, text, btn = TALK, url = btn === TALK ? LINK.cal : LINK.contact)`, 'CTA signature');
// p7: the pop-up says who the call is with
rep(`<h2 id="pfb-book-title" class="pfb-modal__title">Schedule a call with a senior consultant</h2>`,
    `<h2 id="pfb-book-title" class="pfb-modal__title">Let&rsquo;s talk about the future</h2>`, 'modal title');
rep(`<p class="pfb-modal__eb">Exploratory meeting</p>`,
    `<p class="pfb-modal__eb">With a senior family business consultant</p>`, 'modal eyebrow');

/* ---- 2. Homepage hero (p6) ---- */
rep(`        EB('Family business consulting &middot; Philippines'),\n`, '', 'hero eyebrow');
rep(`[BTN(TALK, LINK.cal, 'p'), BTN('Explore our programs', LINK.what, 'l')]`,
    `[BTN(TALK, LINK.cal, 'p')]`, 'hero secondary button');
// the Edward Hayco card overlapping the hero photo; he still appears under What families say
rep(`      Col(44, {gap:0}, [
        IMG('family', 640, {hm:420}),
        C({width:px(340), width_mobile:pct(100), background_background:'classic', background_color:W, padding:bx(26,28,26,28),
           margin:bx(-150,0,0,-90), margin_mobile:bx(-40,12,0,12), flex_gap:gp(12), z_index:2,
           box_shadow_box_shadow_type:'yes', box_shadow_box_shadow:{horizontal:0, vertical:20, blur:44, spread:-22, color:'rgba(25,49,83,0.32)'}}, [
          T('<p>' + q('Premier&rsquo;s continued presence professionalized our orientation, our attitudes, our perspectives towards family business.') + '</p>', {serif:true, size:18.5, lh:1.45, c:N}),
          T('<p><strong>Edward Hayco</strong><br>Founder, Hayco Group of Companies</p>', {size:12.5, lh:1.5, c:M})
        ])
      ])`,
    `      Col(44, {gap:0}, [IMG('family', 640, {hm:420})])`, 'hayco hero card');

/* ---- 3. Programmes eyebrow (p10) ---- */
rep(`Col(56, {gap:18}, [EB('How we can help'), H('Four programs, built around one family.'`,
    `Col(56, {gap:18}, [H('Four programs, built around one family.'`, 'programs eyebrow');

/* ---- 4. Footer (p17): tel: link, and the CTA button goes ---- */
rep(`<br>0917 316 9881<br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>`,
    `<br><a href="tel:+639173169881">0917 316 9881</a><br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>`, 'footer tel');
rep(`      T('<p><a href="mailto:info@premierfamilybusiness.com">info@premierfamilybusiness.com</a><br><a href="tel:+639173169881">0917 316 9881</a><br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>', {c:L, size:14, lh:1.9}),
      BTN(TALK, LINK.cal, 'p')`,
    `      T('<p><a href="mailto:info@premierfamilybusiness.com">info@premierfamilybusiness.com</a><br><a href="tel:+639173169881">0917 316 9881</a><br>35F Cebu Exchange Tower, Salinas Drive, Cebu City</p>', {c:L, size:14, lh:1.9})`,
    'footer cta button');

/* ---- 5. Contact page: the booking card heading matches the new wording ---- */
rep(`          H('Schedule a call', 'h2', 32, {m:26}),`,
    `          H('Let&rsquo;s talk about the future', 'h2', 32, {m:26}),`, 'contact card heading');

/* ---- 5b. Contact page phone also dials (same request, p17) ---- */
rep(`<br>0917 316 9881 &middot; +63 32 252 3504<br>`,
    `<br><a href="tel:+639173169881">0917 316 9881</a> &middot; <a href="tel:+63322523504">+63 32 252 3504</a><br>`, 'contact tel');

/* ---- 6. FEP: the reel (p46) ---- */
rep(`const DIV = (color = R, w = 1) =>`,
    `const REEL = id => Wd('video', {video_type:'youtube', youtube_url:'https://www.youtube.com/shorts/' + id,
  yt_privacy:'yes', lazy_load:'yes', modestbranding:'yes', aspect_ratio:'916', controls:'yes'});
const DIV = (color = R, w = 1) =>`, 'REEL helper');
rep(`  S({pt:0, pb:144, gap:56}, [
    Col(60, {gap:18}, [EB('How it works'), H('The process, in five parts.', 'h2', 48, {m:32})]),`,
    `  S({pt:0, pb:144, pbm:64, gap:48}, [
    Row({gap:56, align:'center'}, [
      Col(34, {gap:0, s:{width_mobile:pct(72)}}, [REEL('Uez9HnU6zkI')]),
      Col(56, {gap:18}, [
        EB('In ninety seconds'),
        H('Why the plan matters more than the document.', 'h2', 40, {m:28}),
        T('<p>A short word from our consultants on what changes for a family once the plan is agreed, and why the conversation has to come before the paperwork.</p>', {size:17, m:16})
      ])
    ])
  ]),
  S({pt:0, pb:144, gap:56}, [
    Col(60, {gap:18}, [EB('How it works'), H('The process, in five parts.', 'h2', 48, {m:32})]),`, 'fep reel section');

/* ---- 7. Legacy in Action: second "Get a copy" goes to the form (p87) ---- */
rep(`        BTN('Get a copy', LINK.book, 'p')`, `        BTN('Get a copy', LINK.form, 'p')`, 'legacy second cta');
// The deck cites the forms.gle shortlink; Premier supplied this full URL for the
// same form. Using the canonical one so it survives the shortlink being reissued.
rep(`  book:'https://www.paypal.com/ncp/payment/2JKJ26FS4KHJ2'`,
    `  book:'https://www.paypal.com/ncp/payment/2JKJ26FS4KHJ2',
  form:'https://docs.google.com/forms/d/e/1FAIpQLSeLpaR-2YZ-k-Utkm6H72Uk69qtyfwGYok9Ip8ylHFpw-yCjg/viewform'`, 'form link');

/* ---- 8. FAQs: the closing CTA opens a mail client (p83) ---- */
rep(`  CTA('Still have a question?', 'Ask us directly. We reply to every message.')`,
    `  CTA('Still have a question?', 'Ask us directly. We reply to every message.', 'Contact us', 'mailto:info@premierfamilybusiness.com')`, 'faq mailto cta');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v11.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
