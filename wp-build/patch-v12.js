/**
 * v12 — Premier IDEA becomes Key Process Management Consulting, and the
 * Premier Leadership Institute becomes Building Effective Governance.
 *
 * Both were stubs carrying bracketed placeholders. Content comes from the two
 * live pages on premierfamilybusiness.com (saved under wp-build/source/),
 * rewritten into this site's voice and rebuilt with this design system rather
 * than transplanted as markup.
 *
 * The pages are converted in place on post IDs 32 and 33, per the client's
 * "recreate, don't redirect". The FAQs page already carries KPMC and BEG
 * groups, so nothing changes there.
 */
const fs = require('fs');

let s = fs.readFileSync('premier-elementor-build.txt', 'utf8');
const rep = (a, b, label) => {
  if (!s.includes(a)) throw new Error('missing: ' + label);
  if (s.split(a).length - 1 !== 1) throw new Error('not unique: ' + label);
  s = s.replace(a, b);
};

/* ---- slugs ---- */
rep(`ose:'/what-we-do/organizational-systems-effectiveness/', idea:'/what-we-do/premier-idea/',
  pli:'/what-we-do/premier-leadership-institute/',`,
    `ose:'/what-we-do/organizational-systems-effectiveness/', kpmc:'/what-we-do/key-process-management-consulting/',
  beg:'/what-we-do/building-effective-governance/',`, 'slugs');

/* ---- programme cards on Home and What We Do ---- */
rep(`  PROGRAMCARD('idea', 'Integrated Digital Execution App', 'Premier IDEA', 'An app that improves planning and execution efficiency through system automation.', LINK.idea),
  PROGRAMCARD('pli', 'Online leadership learning', 'Premier Leadership Institute', 'An online platform for soft-skill, leadership and management development.', LINK.pli)`,
    `  PROGRAMCARD('idea', 'Operations, people and process', 'Key Process Management Consulting', 'The seven key processes a growing business runs on, reviewed, redesigned and handed over as something anyone competent can run.', LINK.kpmc),
  PROGRAMCARD('council', 'Family council and board', 'Building Effective Governance', 'Turning a signed family constitution into a family council and a board that still meet, and still decide, years later.', LINK.beg)`,
    'programme cards');

/* ---- the Legacy in Action cross-link ---- */
rep(`        BTN('Premier Leadership Institute', LINK.pli, 'l')`,
    `        BTN('Building Effective Governance', LINK.beg, 'l')`, 'legacy cross-link');

/* ---- the two pages ---- */
const KPMC_BEG = `/* ---------- KPMC ---------- */
const KPCARD = (title, desc) => Col(23, {gap:12, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(24,0,0,0)}}, [
  H(title, 'h3', 23, {m:21, ls:0}),
  T('<p>' + desc + '</p>', {size:14.5, lh:1.6})
]);
const BULLET = (label, value, last) => Row({gap:24, s:{flex_direction_mobile:'column', flex_gap_mobile:gp(4), border_border:'solid', border_width:bx(1,0,last ? 1 : 0,0), border_color:R, padding:bx(18,0,18,0)}}, [
  Col(30, {gap:0}, [T('<p>' + label + '</p>', {size:13.5, c:M, w:'500'})]),
  Col(66, {gap:0}, [T('<p>' + value + '</p>', {size:15, c:N})])
]);

const kpmc = [
  PAGEHERO('<a href="/">Home</a> &nbsp;/&nbsp; <a href="/what-we-do/">What we do</a> &nbsp;/&nbsp; Key Process Management Consulting',
    'Key Process Management Consulting (KPMC)',
    'The processes a growing business runs on, made to outlast the people who invented them',
    'Going from a business that works to a business that scales is a structural change, not an effort problem. KPMC reviews the key processes you already run, redesigns the ones that will not survive growth, and hands them over as something anyone competent can operate.',
    'idea', [BTN('Book a consultation', LINK.cal, 'p'), BTN('Talk to a consultant', LINK.contact, 'l')]),
  ANSWER('What is key process management consulting?',
    'Key process management consulting is the work of finding the processes a company actually depends on, writing them down, improving them, and putting them under someone&rsquo;s explicit ownership. In a family business those processes usually live in one or two people&rsquo;s heads. That works until the company grows past the point where those people can be everywhere. KPMC covers seven of them: operations, human resources, finance, facilities, reputation and brand, intellectual property, and knowledge.'),
  S({pt:0, pb:144, pbm:64, gap:56}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('What the programme covers'), H('Seven key processes.', 'h2', 46, {m:31})]),
      Col(40, {gap:0}, [T('<p>Not every business needs all seven reviewed at once. We start with the ones where growth is already causing pain.</p>', {size:16})])
    ]),
    Row({gap:32, rgap:44, wrap:true}, [
      KPCARD('Operations management', 'The connected activities that create, deliver and improve what you sell. Execution is where strategy either happens or does not.'),
      KPCARD('Human resource management', 'From the first person you hire to the day someone leaves. Recruitment, terms, performance and separation carry legal and financial consequences that grow with headcount.'),
      KPCARD('Financial management', 'Sourcing money, using it, tracking what it costs, and deciding whether to buy, invest, borrow or retain. Understanding the real value of money and the risk attached to it takes specialist skill.'),
      KPCARD('Facilities management', 'Keeping the built environment working as designed, integrating people, place, process and technology. It draws on climate control, power, utilities, business continuity, sanitation, waste, security and engineering.'),
      KPCARD('Reputation and brand management', 'Once the realm of public relations, now a key process in the context of a company&rsquo;s web presence. Reputation still spans both online and offline, and a company with real market share has to protect its marks.'),
      KPCARD('Intellectual property management', 'Intellectual property is an asset like a building or cash, and in many industries it is the core of the capital. Managing it needs technical, commercial and legal knowledge at once.'),
      KPCARD('Knowledge resource management', 'Hard to value, easy to lose. Its absence shows up as outsourced training hours, poor quality management, weak decisions and people leaving with what they knew.')
    ])
  ]),
  S({bg:P, pt:136, pb:136, ptm:64, pbm:64, gap:56}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('How it works'), H('Three integrated reviews.', 'h2', 46, {m:31})]),
      Col(40, {gap:0}, [T('<p>Each review feeds the next, so the process work is anchored to the strategy rather than running beside it.</p>', {size:16})])
    ]),
    Row({gap:32, rgap:40, s:{flex_direction_mobile:'column'}}, [
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('01 &nbsp; Strategy review', 'h3', 25, {m:22, ls:0}),
        T('<p>We read the overall strategy and the strategic intents behind it, looking for whether they connect cleanly to what the business does day to day.</p>', {size:15.5})
      ]),
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('02 &nbsp; Leadership review', 'h3', 25, {m:22, ls:0}),
        T('<p>We assess the existing leadership culture and capability against what running these processes will actually demand of it.</p>', {size:15.5})
      ]),
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('03 &nbsp; Process management', 'h3', 25, {m:22, ls:0}),
        T('<p>Planning, organising, directing and controlling the key processes themselves, through assessment, design and execution.</p>', {size:15.5})
      ])
    ])
  ]),
  S({pt:0, pb:144, pbm:64, gap:48}, [
    Row({gap:64}, [
      Col(34, {gap:18}, [EB('Inside process management'), H('Assess, design, execute.', 'h2', 40, {m:30})]),
      Col(58, {gap:0}, [
        BULLET('Process assessment', 'Documenting the activities and processes you already run and linking them to the strategic initiatives they serve, so they can be standardised and learned from. It covers inputs, procedures and outputs, and it tracks revisions as they happen.'),
        BULLET('Process design and development', 'Changes, revisions and new processes introduced to activate initiatives tied to the strategy. The aim is consistent quality of delivery against what the customer actually asked for.'),
        BULLET('Process execution', 'Rolling out the agreed activities and reporting phase by phase to management or the owners. Where the right people are not yet in place, this is where Premier&rsquo;s talent and organisation matching comes in.', true)
      ])
    ])
  ]),
  CTA('Find out which of the seven is costing you most.', 'Start with a conversation about where growth is already hurting.')
];

/* ---------- BEG ---------- */
const beg = [
  PAGEHERO('<a href="/">Home</a> &nbsp;/&nbsp; <a href="/what-we-do/">What we do</a> &nbsp;/&nbsp; Building Effective Governance',
    'Building Effective Governance (BEG)',
    'A signed constitution is the start of governance, not the end of it',
    'Families sign a constitution and then discover the harder part: holding the meetings, keeping the decisions collegial, and sustaining it once the initial energy fades. BEG puts the family council and the board in place, and stays with them while the habit forms.',
    'council', [BTN('Book a consultation', LINK.cal, 'p'), BTN('Talk to a consultant', LINK.contact, 'l')]),
  ANSWER('What is building effective governance?',
    'Building effective governance is the work of establishing the two bodies a family enterprise makes its decisions through, the family council and the board of directors, and then making them function. Every strategic and tactical decision comes out of those two rooms. BEG builds on where Family Enterprise Planning left off: the constitution is drafted and signed, and the family now has to shift from founder-centred decisions to collegial ones.'),
  S({pt:0, pb:144, pbm:64, gap:56}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('Where it starts'), H('Two activities, before the meetings begin.', 'h2', 46, {m:31})]),
      Col(40, {gap:0}, [T('<p>The programme opens with family team building, then the family constitution review. Each is a full day.</p>', {size:16})])
    ]),
    Row({gap:56, align:'center'}, [
      Col(46, {gap:14, s:{border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(28,0,0,0)}}, [
        EB('Family team building'),
        H('Keeping the family together by learning to work together.', 'h3', 28, {m:23}),
        T('<p>Exercises chosen and tailored by the lead facilitator to build cohesion and work through the issues the family already has: direct and frequent communication, ground rules for it, appreciating what each member brings, resolving conflict, handling feedback, and acknowledging what people have contributed. It prepares the family to collaborate on the constitution review that follows.</p>', {size:15.5})
      ]),
      Col(46, {gap:14, s:{border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(28,0,0,0)}}, [
        EB('Family constitution review'),
        H('Revisiting and sustaining the framework of family unity.', 'h3', 28, {m:23}),
        T('<p>A constitution stays useful only while it stays relevant. The family articulates how its needs have changed, and we frame the amended clauses to match, including changes that accommodate a changing family, such as new members joining. We then review the document for form and substance, and check it against current legislation.</p>', {size:15.5})
      ])
    ])
  ]),
  S({bg:P, pt:136, pb:136, ptm:64, pbm:64, gap:56}, [
    Row({gap:48, align:'flex-end'}, [
      Col(52, {gap:18}, [EB('What the consultant does'), H('Three things an outsider can do that the family cannot.', 'h2', 44, {m:30})]),
      Col(40, {gap:0}, [T('<p>A consultant joins the family and business systems as facilitator, coach, technical adviser or change catalyst.</p>', {size:16})])
    ]),
    Row({gap:32, rgap:40, s:{flex_direction_mobile:'column'}}, [
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('An unbiased view of the family dynamics', 'h3', 25, {m:22}),
        T('<p>A window on the family from outside it. Issues get approached from a vantage point no one inside the family has, and that view becomes the benchmark for change.</p>', {size:15.5})
      ]),
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('Expertise in both process and content', 'h3', 25, {m:22}),
        T('<p>Making sure the constitution is a genuine framework for deciding things, not a document in a drawer. Consultants are assigned for industry expertise, so the advice carries weight on substance as well as process, and family council members are mentored as they go.</p>', {size:15.5})
      ]),
      Col(31, {gap:14, s:{width_mobile:pct(100), border_border:'solid', border_width:bx(2,0,0,0), border_color:G, padding:bx(26,0,0,0)}}, [
        H('Governance that becomes a habit', 'h3', 25, {m:22}),
        T('<p>Discipline into habit, habit into system, system into a culture of good governance across both the family and the business. The weakest link in any system is the human one, so the system has to instil a cadence of accountability.</p>', {size:15.5})
      ])
    ])
  ]),
  S({pt:0, pb:144, pbm:64, gap:48}, [
    Row({gap:64}, [
      Col(34, {gap:18}, [EB('What Premier commits to'), H('A year in the room with you.', 'h2', 40, {m:30})]),
      Col(58, {gap:0}, [
        BULLET('Family council', 'Twelve months of monthly family council meeting facilitation and guidance, with the option of a consultation before each meeting.'),
        BULLET('Board of directors', 'Twelve months of monthly board of directors facilitation and guidance, on the same terms.'),
        BULLET('In each meeting', 'Following up the tasks that came out of Family Enterprise Planning, advising on agenda priorities and preparation, and co-moderating alongside the presider.'),
        BULLET('When it gets difficult', 'Bringing relevant information and insight to what is being discussed, mediating conflict if it arises, and holding an objective and truthful standard in the room.', true)
      ])
    ])
  ]),
  CTA('Your constitution is signed. Now make it govern something.', 'Talk to us about putting the family council and board to work.')
];
`;

const a = s.indexOf('/* ---------- IDEA ---------- */');
const b = s.indexOf('/* ---------- WHO WE ARE ---------- */');
if (a < 0 || b < 0 || b <= a) throw new Error('section markers missing or out of order');
s = s.slice(0, a) + KPMC_BEG + '\n' + s.slice(b);

/* ---- page registry ---- */
rep(`[32,'Premier IDEA',idea],[33,'Premier Leadership Institute',pli],`,
    `[32,'Key Process Management Consulting',kpmc],[33,'Building Effective Governance',beg],`, 'pages array');

if (/\bLINK\.(idea|pli)\b/.test(s)) throw new Error('a LINK.idea / LINK.pli reference survived');
if (/Premier IDEA|Premier Leadership Institute/.test(s)) throw new Error('an old programme name survived');

fs.writeFileSync('premier-elementor-build.txt', s);
fs.writeFileSync('premier-elementor-build-v12.txt', s);
new Function('return ' + s);
console.log('ok, bytes', s.length, '| pages:', (s.match(/\[\d+,'[^']+',\w+\]/g) || []).length);
