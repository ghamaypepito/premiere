# Premier Family Business Consulting: 12-month SEO and AEO retainer plan

Prepared for the retainer that begins once the new WordPress and Elementor site is live.
Months 1 to 6 are the core commitment. Months 7 to 12 extend it, and they are confirmed at the
Month 6 review.

- **SEO** (search engine optimisation): ranking in Google and Bing for the searches that bring
  in clients.
- **AEO** (answer engine optimisation): getting Premier named, cited and described accurately in
  AI answers. That means Google AI Overviews and AI Mode, ChatGPT, Gemini, Perplexity, Microsoft
  Copilot and Claude.

The two share a foundation: a fast, crawlable site; clear entities; content that answers real
questions; and other sites that vouch for Premier. This plan builds that foundation once and
reports on both every month.

> **How to read the calendar.** Month 1 is the first full calendar month after launch. If the site
> launches in October 2026, Month 1 is November 2026 and Month 12 is October 2027.

---

## 1. Starting position

What we know from the audit, the rebuild and the archived site:

| Area | Current state | Why it matters |
|---|---|---|
| Availability | The old site throws a PHP fatal error ("There has been a critical error on this website") | Google drops pages that keep failing. Rankings the domain held are already slipping |
| Information architecture | Rebuilt around one wedge: succession. The URLs are new | Every retired URL needs a 301 redirect, or its link equity is lost |
| Service naming | Program brands ("Organizational Systems Effectiveness", "Premier IDEA", "KPMC", "BEG") match almost no searches | Pages need to rank for what buyers type, like "family business succession planning Philippines", while keeping the brand names |
| Content | 4 migrated articles, an FAQ hub, Legacy in Action (book and podcast), and Events (Family Enterprise Roadshow) | A small but strong base. The *Legacy in Action* book, the FFI credentials and the Roadshow are proof that most competitors cannot match |
| Structured data | FAQPage on Family Enterprise Planning and on FAQs. Organization, LocalBusiness and Article are planned | This is how AI engines connect "Premier", "Jon Ramos" and "Cebu" into one entity |
| Authority signals | Jon Ramos is an FFI Fellow and the first Filipino on the FFI Board. Partners include FFI, FBN Asia and UA&P. Consultants hold FFI certificates | High-trust third parties. They need to *link to* and *mention* Premier online, not just appear as logos |
| Conversion | Booking runs through a HubSpot meeting link, now in an on-site pop-up | Must be tracked as a GA4 key event, or we can't report leads |
| Measurement | No baseline is available. The site is down, and we have no confirmed access to Search Console or Analytics history | Month 1 sets the baseline. Targets are confirmed against it |

---

## 2. Goals for the 12 months

The goals are business outcomes first and rankings second. Numeric targets are **set at the end of
Month 1** against the real baseline, and then held for the year. Before that, any number would be
a guess.

| # | Goal | Primary KPI | How we measure |
|---|---|---|---|
| G1 | Keep the site healthy and fast | Uptime ≥ 99.9%; all Core Web Vitals "Good" on mobile (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1) | Uptime monitor, PageSpeed Insights / CrUX, Search Console |
| G2 | Win non-branded search demand for succession and governance | Non-branded clicks and impressions; count of priority keywords in the top 10 | Search Console (brand terms filtered out), rank tracker |
| G3 | Become the answer AI engines give for family business advisory in the Philippines | AI Visibility Score, the share of 30 tracked prompts where Premier is mentioned or cited | Monthly prompt panel (see `ai-visibility-prompts.md`) |
| G4 | Own the local and brand entity | Google Business Profile views and actions; branded search; knowledge panel present | GBP Insights, Search Console, manual SERP check |
| G5 | Turn visibility into conversations | Exploratory meetings booked from organic and AI referrals; contact form submissions | GA4 key events + HubSpot source attribution |

**Direction of travel we expect**, not a promise:
- **Months 1–3:** recover, stabilise, index.
- **Months 4–6:** first non-branded page-one positions for long-tail questions.
- **Months 7–12:** compounding traffic, AI citations, and a steady flow of organic meetings.

Consulting search volume in the Philippines is modest. A handful of qualified meetings a month from
organic and AI search is a strong outcome for a firm like this.

---

## 3. Keyword and question territory

The keyword map is finalised in Month 1 with tool data (Search Console, Google Keyword Planner and
one of Ahrefs or Semrush). These are the clusters it will be built on, in priority order:

| Cluster | Example searches and prompts | Home page (money page) | Supporting content |
|---|---|---|---|
| **1. Succession planning** (the wedge) | family business succession planning Philippines; succession plan for family business; how to choose a successor in a family business; succession vs estate planning Philippines | `/what-we-do/family-enterprise-planning/` | Guides, FAQs, *Legacy in Action* excerpts |
| **2. Family governance** | family constitution Philippines; family council; family charter template; family business governance structure | Building Effective Governance (FEP / governance page) | Family constitution guide, family council explainer |
| **3. Professionalising the business** | professionalize family business; organizational structure for family business; SOPs family business; KPI system for SMEs | `/what-we-do/organizational-systems-effectiveness/`, KPMC | Process, structure and HR articles |
| **4. Next generation and leadership** | next generation leadership program Philippines; preparing children to take over family business; leadership training Cebu | `/what-we-do/premier-leadership-institute/` | NextGen stories, events |
| **5. Local and commercial intent** | family business consultant Philippines; family business consultant Cebu / Manila / Davao; management consulting Cebu | Home, Who We Are, Contact | GBP, city mentions in Events |
| **6. Brand and people** | Premier Family Business Consulting; Jon Ramos family business; Legacy in Action book | Home, Jon Ramos profile, `/legacy-in-action/` | Podcast, press, partner pages |
| **7. Fees and process** (high intent, often dodged) | how much does a family business consultant cost Philippines; how long does succession planning take | FAQs, Approach | A published fee range or pricing logic. This depends on the client (see §9) |

**Language.** Most buyers search in English. In Month 4 we test whether Tagalog, Taglish or
Cebuano queries show impressions in Search Console. We only invest there if they do.

---

## 4. The AEO layer: what we do beyond classic SEO

AI engines answer from pages they can crawl, from entities they understand and from sources they
trust. Each workstream below maps to one of those:

1. **Let them in (crawl access).** In Month 1 we review `robots.txt` and the host's firewall or CDN
   bot rules with Premier. We recommend allowing the search and retrieval crawlers: Googlebot,
   Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot and Claude-SearchBot / Claude-User. Whether
   to also allow the *training* crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) is a separate
   business decision, and Premier makes it. Blocking Google-Extended does **not** remove the site
   from AI Overviews.
2. **Be one clear entity (entity clarity).** Premier needs one name, address and phone everywhere.
   The site carries Organization + ProfessionalService/LocalBusiness schema, with `sameAs` links to
   LinkedIn, Facebook, Instagram, YouTube and partner listings. It carries Person schema for Jon
   Ramos and the senior consultants, with credentials (FFI Fellow, CFWA, RFC), and Book and
   PodcastSeries schema for *Legacy in Action*. In Month 3 we check whether Premier and Jon Ramos
   qualify for a Wikidata entry, and create one only if independent sources support it.
3. **Write so an answer engine can lift it (answer-first content).** Each key page opens with a
   40–60 word direct answer to its main question, then the depth. That means definitions, numbered
   steps, comparison tables and short FAQs written in the words buyers use. Statistics are cited to
   their source.
4. **Be quotable by others (third-party corroboration).** AI answers lean heavily on sources other
   than your own site: business press (BusinessWorld, Inquirer, SunStar, Philstar), partner sites
   (FFI, FBN Asia, UA&P), podcasts, LinkedIn and directories. The digital PR work in Months 4–12
   targets these.
5. **Bing matters here (Bing and IndexNow).** Copilot and several AI search products draw on
   Bing's index. We verify Bing Webmaster Tools and enable IndexNow so new pages are picked up
   within hours.
6. **Optional `llms.txt`.** It's a cheap, low-risk addition: a plain-text map of the key pages. No
   major engine has confirmed that it uses the file, so we add it and don't count on it.
7. **Track it monthly (measurement).** We run a fixed panel of 30 prompts across six engines each
   month and record whether Premier is mentioned, cited (linked) and described accurately. We also
   track AI-referral sessions in GA4 (chatgpt.com, perplexity.ai, gemini.google.com,
   copilot.microsoft.com, claude.ai).

> **A note on rich results.** Since 2023, Google shows FAQ rich results only for a small set of
> authoritative government and health sites, and it has retired HowTo rich results. We still ship
> FAQPage markup, because it helps machines read the Q&A. We will not report FAQ or HowTo snippets
> as a target, and we will swap the planned HowTo markup on Approach for plain, well-structured
> steps.

---

## 5. Month-by-month roadmap

### Phase 1: Stabilise and baseline (Months 1–2)

**Month 1: Recover and measure**
- Confirm the fatal error is resolved on production and that staging and production are separate.
- Crawl the whole site (Screaming Frog or Sitebulb). Fix 4xx and 5xx errors, redirect chains,
  orphan pages and missing canonicals.
- **Redirect audit.** Map every URL from the archived site and from Search Console's history to its
  new home with a 301. This includes the old "WHAT WE DO", "Family Biz Buzz" and course URLs.
- Set up or verify Google Search Console (Domain property), Bing Webmaster Tools, GA4 and Google
  Tag Manager. Submit XML sitemaps.
- Tracking: HubSpot meeting booked, contact form submit, phone and email clicks, and the podcast
  and book clicks as GA4 key events. Add an "AI referrals" channel group.
- Uptime monitoring, daily off-site backups, a security plugin or WAF, and an admin user audit.
- Claim or clean up the Google Business Profile for the 35F Cebu Exchange Tower office.
- **Baselines:** rankings for about 60 target keywords, the first AI prompt panel, Core Web
  Vitals, backlink profile, and a competitor snapshot (3–5 firms: local boutiques, the
  family business practices of the large advisory firms, and university family business centres).
- **Deliverable:** baseline report plus locked 12-month KPI targets.

**Month 2: Technical and on-page foundation**
- Core Web Vitals pass. The hero film (`hero-long-table.mp4`) needs a lightweight poster, lazy
  loading and a mobile fallback. Serve images as WebP/AVIF with explicit dimensions, and trim the
  Elementor CSS/JS and unused plugins.
- Title tags, meta descriptions, H1s and image alt text for every page. Service pages lead with
  the search term and keep the program brand: e.g. H1 "Family Business Succession Planning", with
  the eyebrow "Family Enterprise Planning (FEP)".
- Internal linking. Every page links to Succession, the hub. Every article links to one money page
  and one related article.
- Full schema rollout: Organization, ProfessionalService/LocalBusiness, Person (team), Article
  (Resources), Event (Events), Book and PodcastSeries (Legacy in Action), BreadcrumbList. Validate
  it all in the Rich Results Test and the Schema Markup Validator.
- Robots and AI crawler policy agreed (§4.1). IndexNow enabled. `llms.txt` published.

### Phase 2: Entity, local and first content (Months 3–4)

**Month 3: Own the entity**
- NAP consistency across directories: Google, Bing Places, Apple Business Connect, LinkedIn,
  Facebook, and the relevant Philippine business directories and chambers (e.g. Cebu Chamber of
  Commerce and Industry, if Premier is a member).
- Partner profile pages. Ask FFI, FBN Asia and UA&P to link to premierfamilybusiness.com from
  Premier's and Jon's listings.
- Team profile pages. Each senior consultant gets bio, credentials and a LinkedIn `sameAs`.
  Consultants update their own LinkedIn headline and "Experience" entries to link to the site.
- Wikidata eligibility check.
- **Content:** answer-first rewrites of the 5 service pages. Publish **pillar 1**, "Family Business
  Succession Planning in the Philippines: A Complete Guide" (≈ 3,000 words, interviews with Jon
  Ramos).

**Month 4: Content engine starts**
- Monthly cadence from here: **2 cluster articles + 1 content refresh + 1 FAQ expansion**.
- Publish **pillar 2**, "Family Constitution and Family Council: A Guide for Filipino Family
  Businesses".
- First cluster articles, e.g. "Succession Planning vs Estate Planning in the Philippines" and "5
  Signs Your Family Business Is Ready for a Succession Plan".
- Start the monthly **SME interview**: 45 minutes with one consultant, which gives two articles'
  worth of original expertise.
- Language test (§3).

### Phase 3: Authority and conversion (Months 5–6)

**Month 5: Digital PR and events**
- Pitch 2–3 expert commentary pieces or op-eds by Jon Ramos to Philippine business media.
- Event pages. Every Roadshow and forum gets its own indexable page with Event schema, and a recap
  article afterwards with photos, city and takeaways. Recaps are local SEO gold for Bohol, Davao,
  Iloilo and other cities.
- *Legacy in Action* podcast. Publish transcripts or show notes on-site for each episode, and add
  chapters on YouTube.
- Publish **pillar 3**, "How to Professionalize a Family Business".

**Month 6: Mid-term review**
- Conversion review. Test booking pop-up placement, CTA copy and the contact form. Check which
  pages bring in meetings.
- Refresh the lowest-performing money page.
- **Six-month review report.** Progress against targets, what worked, what didn't, and the
  recommended scope for Months 7–12.

### Phase 4: Scale and compound (Months 7–12, the extension)

| Month | Focus | Headline deliverables |
|---|---|---|
| **7** | Original research | Launch a short survey of Filipino family business owners through Premier's network and events, e.g. "State of Filipino Family Business 2027". Original data is the single most-cited content type in AI answers |
| **8** | Pillar 4 + link building | Next-generation leadership pillar. Guest articles on partner and association sites. Podcast guest appearances for Jon and senior consultants |
| **9** | Research publication | Publish the survey report as an ungated web page with a PDF download. Press release, media pitching, and a LinkedIn carousel |
| **10** | Geographic expansion | Pages for the regions Premier actually serves (Metro Manila, Davao, and Southeast Asia if relevant), backed by real case evidence and events, not thin city pages |
| **11** | Content refresh sprint | Update every article older than 9 months: new data, new FAQs, current year. Consolidate overlapping posts |
| **12** | Annual review + Year 2 plan | Year-in-review report, updated keyword map and prompt panel, and a Year 2 roadmap |

Months 7–12 keep the same monthly cadence: 2 articles, 1 refresh, 1 FAQ expansion, 2–3 PR or
link outreach pushes, plus maintenance.

---

## 6. Monthly retainer scope

Every month has two parts. The **maintenance** part keeps the site safe and healthy. The
**growth** part moves the KPIs.

### A. Maintenance and site care (every month)

| Task | Frequency |
|---|---|
| WordPress core, theme, Elementor Pro and plugin updates, tested on staging first | Weekly or as released |
| Off-site backups verified, with one restore test per quarter | Daily backup; monthly check |
| Uptime and SSL monitoring | Continuous |
| Security scan, login protection, admin user review | Weekly scan; monthly review |
| Broken links, 404s and redirect log | Monthly |
| Search Console: coverage, indexing, manual actions, enhancements | Weekly glance; monthly report |
| Core Web Vitals and page speed | Monthly |
| Form and booking pop-up test submission | Monthly |
| Content updates on request (team changes, events, stats) | As requested, within an agreed number of hours |

### B. SEO and AEO growth (every month from Month 4)

| Task | Volume |
|---|---|
| New cluster articles (answer-first, SME-sourced, schema'd) | 2 |
| Existing page or article refresh | 1 |
| FAQ additions across service pages and the FAQ hub | 3–5 questions |
| Internal linking pass on new content | Ongoing |
| Digital PR, partner or link outreach | 2–3 targets |
| Rank tracking (about 60 keywords) and AI prompt panel (30 prompts × 6 engines) | Monthly |
| GBP posts (events, articles, updates) | 2–4 |

**Suggested effort split:** Months 1–3 are about 60% technical and 40% content and entity. From
Month 4 it's about 25% maintenance and technical, 50% content, and 25% authority and PR.

---

## 7. Reporting cadence

| Report | When | Audience | Contents |
|---|---|---|---|
| **Monthly report** | By the 5th business day of the next month | Jon Ramos + marketing contact | Use `monthly-report-template.md`: one-page summary, KPIs vs target, AI visibility, work done, next month, asks |
| **Quarterly review call** | Months 3, 6, 9, 12 | Leadership | 30–45 min. Trends, wins, what to reprioritise |
| **Six-month review** | End of Month 6 | Leadership | Formal review and scope for Months 7–12 |
| **Annual report** | End of Month 12 | Leadership | Year in review + Year 2 plan |
| **Incident notice** | Same day | Marketing contact | Downtime, a security issue, a manual action, a failed update |

**Report principles**
- Compare month-on-month, and year-on-year once 12 months of data exist.
- Separate branded from non-branded search. Branded growth is mostly driven by events and PR, and
  it shouldn't be credited to SEO.
- Report leads, not just traffic. The headline number is **meetings booked from organic and AI
  sources**.
- Say plainly when something went down, and why.

---

## 8. Tools

| Purpose | Tool |
|---|---|
| Search data | Google Search Console, Bing Webmaster Tools |
| Analytics and conversions | GA4 + Google Tag Manager, HubSpot (meeting source) |
| Rank tracking | One of Semrush, Ahrefs or SE Ranking (Philippines location, mobile + desktop) |
| Crawling | Screaming Frog or Sitebulb |
| SEO plugin | Rank Math or Yoast (one only) for titles, sitemaps and schema, plus a custom JSON-LD block for Person, Book and Podcast |
| Speed | PageSpeed Insights, CrUX, the host's caching and CDN |
| AI visibility | The manual 30-prompt panel (logged in a sheet), optionally supplemented by an AI visibility tracker in the SEO suite |
| Uptime and security | UptimeRobot or Better Stack; Wordfence, Solid Security or a host WAF |
| Reporting | Looker Studio dashboard (GSC + GA4) linked from each monthly report |

---

## 9. What we need from Premier

The plan depends on these. When one is late, the monthly report says which deliverables move
because of it.

| Item | When | Why |
|---|---|---|
| Admin access to hosting, WordPress, GSC, GA4, GBP, HubSpot | Month 1 | Nothing can be measured or fixed without it |
| Decision on AI training crawlers (§4.1) | Month 2 | Sets robots.txt |
| Current proof numbers (years, families served, consultants) | Month 2 | Used across schema, pages and PR. Stale numbers hurt trust |
| One 45-minute SME interview per month | From Month 3 | Original expertise is what makes content rank and get cited |
| Content approval within 5 business days | Ongoing | Keeps the publishing cadence on schedule |
| Fee range or pricing logic for succession work | By Month 4 | This is the question buyers ask most often. Answering it wins clicks and AI mentions |
| Event calendar and photos | Ongoing | Event pages and recaps |
| Two or three client stories (anonymised where needed) | By Month 6 | Case evidence for pages and PR |
| Survey distribution through Premier's network | Month 7 | Original research |

---

## 10. Risks and honest limits

- **Nobody can guarantee rankings or AI mentions.** Google and the AI engines change their systems
  without notice. We commit to the work, the measurement and clear reporting.
- **The outage has cost some equity.** Recovery of the old rankings depends on how long the site
  was down and on the redirect coverage.
- **AI answers vary.** The same prompt can return different answers on different days. The panel
  runs at the same time each month, from the same location, logged out. We read the results as a
  trend, not as individual wins or losses.
- **Low search volume.** Some priority terms have tens of searches a month, not thousands. We
  measure success in qualified meetings, not raw traffic.
- **Content without expertise underperforms.** If SME interviews stop, content quality and
  results will drop, and the report will say so.
