const fs = require('fs');
let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => { if (!s.includes(a)) throw new Error('missing: ' + label); s = s.replace(a, b); };

rep(`yntig:[149,'atty-allan-yntig-ffi-cfwa.jpg']`, `yntig:[149,'atty-allan-yntig-ffi-cfwa.jpg'],
  teamgroup:[329,'premier-team-culture-of-engagement-and-trust.jpg'], hrignite:[330,'premier-hr-ignite-culture-of-values-session.jpg'],
  office:[331,'premier-family-business-consulting-cebu-office.jpg'], rsgroup:[332,'family-enterprise-roadshow-bohol-2026-participants.jpg'],
  rsguests:[333,'jon-ramos-family-enterprise-roadshow-bohol-2026.jpg'], rssession:[334,'family-enterprise-roadshow-bohol-2026-session.jpg'],
  rspodium:[335,'jon-ramos-speaking-family-enterprise-roadshow.jpg'], liabook:[336,'legacy-in-action-book-by-jon-ramos.jpg']`, 'media');

rep(`cal:'https://meetings.hubspot.com/premier-family-business-consulting/exploratory-meeting' };`,
    `cal:'https://meetings.hubspot.com/premier-family-business-consulting/exploratory-meeting', lia:'/legacy-in-action/',
  book:'https://www.paypal.com/ncp/payment/2JKJ26FS4KHJ2', yt:'https://www.youtube.com/@legacyinactionpodcast' };`, 'links');

// footer: booking pop-up, calendar CTA, Legacy in Action link
rep(`const SOCIAL_LINKS = [`, fs.readFileSync('booking-popup.txt', 'utf8') + `const SOCIAL_LINKS = [`, 'booking helper');
rep(`<a href="/resources/">Resources</a><br><a href="/faqs/">FAQs</a>`, `<a href="/resources/">Resources</a><br><a href="/legacy-in-action/">Legacy in Action</a><br><a href="/faqs/">FAQs</a>`, 'footer explore');
rep(`      BTN('Schedule a call', LINK.contact, 'p')
    ])
  ]),
  DIV('#34507A', 1),`, `      BTN('Schedule a call', LINK.cal, 'p')
    ])
  ]),
  DIV('#34507A', 1),`, 'footer btn');
rep(`<a href="/privacy-policy/">Privacy Policy</a></p>', {c:'#9FB0C9', size:13})
]);`, `<a href="/privacy-policy/">Privacy Policy</a></p>', {c:'#9FB0C9', size:13}),
  BOOKING()
]);`, 'footer booking');
rep(`const CTA = (title, text, btn = 'Schedule a call', url = LINK.contact) =>`, `const CTA = (title, text, btn = 'Schedule a call', url = btn === 'Schedule a call' ? LINK.cal : LINK.contact) =>`, 'cta');
rep(`[BTN('Schedule a call', LINK.contact, 'p'), BTN('Explore our programs', LINK.what, 'l')]`, `[BTN('Schedule a call', LINK.cal, 'p'), BTN('Explore our programs', LINK.what, 'l')]`, 'home hero');

// Who We Are: life at Premier, between core values and milestones
rep(`  S({bg:P, pt:136, pb:136, gap:48}, [
    Row({gap:64}, [
      Col(34, {gap:22}, [
        EB('Milestones'),`, `  S({pt:0, pb:144, pbm:64, gap:56}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('Life at Premier'), H('The people and the rooms where the work happens.', 'h2', 46, {m:31})]),
      Col(40, {gap:0}, [T('<p>From roadshows that bring business families together across the country to the everyday work in our Cebu office.</p>', {size:16})])
    ]),
    Row({gap:56, align:'center'}, [
      Col(62, {gap:0}, [IMG('rsgroup', 310, {hm:150})]),
      Col(32, {gap:12}, [H(q('Experts who are passionate about family business.'), 'p', 28, {lh:1.3, m:23}), T('<p>The Family Enterprise Roadshow, Bohol 2026.</p>', {size:14, c:M})])
    ]),
    Row({gap:56, align:'center', s:{flex_direction_mobile:'column-reverse'}}, [
      Col(32, {gap:12}, [H(q('A culture of high engagement and trust.'), 'p', 28, {lh:1.3, m:23}), T('<p>The Premier team at our office in Cebu Exchange Tower.</p>', {size:14, c:M})]),
      Col(62, {gap:0}, [IMG('teamgroup', 350, {hm:170})])
    ])
  ]),
  S({bg:P, pt:136, pb:136, gap:48}, [
    Row({gap:64}, [
      Col(34, {gap:22}, [
        EB('Milestones'),`, 'who life');

// Events: most recent roadshow
rep(`    T('<p>[Upcoming event titles, dates, venues and registration links to be supplied by Premier.]</p>', {size:16})
  ]),`, `    T('<p>[Upcoming event titles, dates, venues and registration links to be supplied by Premier.]</p>', {size:16})
  ]),
  S({pt:0, pb:120, pbm:64, gap:0}, [
    Row({gap:56, align:'center'}, [
      Col(56, {gap:0}, [IMG('rsguests', 440, {hm:240, pos:'center 30%'})]),
      Col(38, {gap:20}, [
        EB('Most recent'),
        H('The Family Enterprise Roadshow, Bohol 2026', 'h2', 38, {m:28}),
        T('<p>Transition from founder strength to institutional strength.</p>', {serif:true, size:22, lh:1.45, c:N, m:19}),
        T('<p>Part of Premier&rsquo;s fifteenth-anniversary roadshow connecting families nationwide, the Bohol edition brought founders, successors and family members together on how a business moves from relying on its founder to standing on its own systems.</p>', {size:15.5}),
        Row({gap:12, s:{flex_direction_mobile:'row'}}, [
          Col(49, {gap:0, s:{width_mobile:pct(49)}}, [IMG('rspodium', 150, {hm:110})]),
          Col(49, {gap:0, s:{width_mobile:pct(49)}}, [IMG('rssession', 150, {hm:110})])
        ])
      ])
    ])
  ]),`, 'events roadshow');

// Our Team: inside Premier
rep(`  S({pt:32, pb:0, gap:0}, []),
  CTA('Meet the consultant who would lead your engagement.', 'Tell us`, `  S({bg:P, pt:120, pb:120, gap:48}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('Inside Premier'), H('People care and relations, practiced in-house first.', 'h2', 42, {m:29})]),
      Col(40, {gap:0}, [T('<p>Through HR Ignite, the team keeps deepening its culture of values, with the same focus on people care and relations we bring to the families we serve.</p>', {size:16})])
    ]),
    Row({gap:24, s:{flex_direction_mobile:'column'}}, [
      Col(50, {gap:10}, [IMG('hrignite', 340, {hm:220}), T('<p>An HR Ignite session on the culture of values.</p>', {size:13, c:M})]),
      Col(50, {gap:10}, [IMG('office', 340, {hm:220}), T('<p>Our office at Cebu Exchange Tower, Cebu City.</p>', {size:13, c:M})])
    ])
  ]),
  S({pt:144, pb:0, gap:0}, []),
  CTA('Meet the consultant who would lead your engagement.', 'Tell us`, 'team inside');

// Legacy in Action page
rep(`/* ---------- save ---------- */`, fs.readFileSync('legacy-section.txt', 'utf8') + `/* ---------- save ---------- */`, 'legacy page');
rep(`[159,'FAQs',faqs],[3,'Privacy Policy',privacy]];`, `[159,'FAQs',faqs],[3,'Privacy Policy',privacy],[337,'Legacy in Action',legacy]];`, 'pages');
rep(`  const fd = new FormData();`, `  if (pid === 337) await fetch('/wp-admin/post.php?post=337&action=elementor', {credentials:'same-origin'});
  const fd = new FormData();`, 'prefetch');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v8.txt', s);
new Function(s);
console.log('ok', s.length);
