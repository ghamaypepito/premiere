# Premier: Global SEO & AEO Playbook

What Premier needs to do, in order, to rank outside the Philippines. It covers both classic search (Google, Bing) and answer engines (Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Copilot, Gemini). Every page brief in the form follows the rules on this page.

> **Keyword numbers.** None of the keywords here come with volume or difficulty figures. Nothing was measured, so we won't make numbers up. Check each primary keyword in Google Keyword Planner or Semrush/Ahrefs (see **Tools**) before a page is locked, and record the volume in the brief.

---

## 1. Fix these before anything else

1. **The live site is down.** `premierfamilybusiness.com` returns a WordPress critical error. Every day it is down, Google re-crawls a broken page and slowly drops existing rankings. Fix it or put a static holding page up now (see `WORDPRESS-SETUP.md` §0).
2. **Keep the rankings the old site already has.** Before launch, export every old URL (Search Console > Pages, plus a Screaming Frog crawl of the Wayback snapshot) and 301-redirect each one to its new home. Examples: `/family-enterprise-planning/` → Succession, `/building-effective-governance/` → Family Governance, `/family-biz-buzz/...` → the same article under Resources.
3. **Search Console and Bing Webmaster Tools** verified on the new domain on launch day, with the XML sitemap submitted to both. Bing matters more than it used to because its index feeds ChatGPT search and Microsoft Copilot.
4. **One SEO plugin.** Use **Rank Math** (or Yoast, but not both). It handles titles, meta, canonicals, sitemap, breadcrumbs, redirects, IndexNow and most schema.

---

## 2. How Premier can realistically win globally

"Family business consulting" on its own is a crowded global head term. The Family Business Consulting Group, Cambridge Family Enterprise Group, the Big Four family-business practices and many university centres already hold it. Premier won't outrank them head-on in year one. It can win three ways:

| Angle | Why it works | Example targets |
|---|---|---|
| **Asia specificity** | Few global firms write seriously about Asian, Filipino and Filipino-Chinese family enterprises. That is a gap Premier can own. | family business succession in Asia · Filipino-Chinese family business succession · family governance in Southeast Asia |
| **Question-level content** | Long, specific questions have weak competition and are exactly what AI answer engines quote. | how to write a family constitution · when should a founder start succession planning · how to pay family members in a family business |
| **Named expertise** | Jon Ramos is an FFI Fellow and the first Filipino on the FFI Board. The team holds CFBA/CFWA credentials, and there is the *Legacy in Action* book and podcast. Search engines and LLMs rank named, credentialed experts. | Jon Ramos family business · Legacy in Action book · family business podcast Asia |

**Rule of thumb for "global":** write primary keywords **without** a country, so the page can rank anywhere. Put the geography (Philippines, Southeast Asia, Asia) in **secondary** keywords, the body copy and the schema's `areaServed`. The Contact page and Google Business Profile are the exception: they are local on purpose (Cebu, Manila).

---

## 3. Keyword architecture (pillar and cluster)

Each service page is a **pillar**. Each article under Resources is a **cluster** page that answers one narrower question and links back up to its pillar with a descriptive anchor.

| Pillar (page) | Primary keyword | Cluster article ideas (each one is a brief) |
|---|---|---|
| Succession & Continuity | family business succession planning | How to choose a successor in a family business · Succession planning timeline: what happens in years 1–5 · Why most family businesses don't survive the third generation · Founder's guide to letting go · Selling to family vs outside buyer · Estate planning vs succession planning |
| Family Governance | family governance | How to write a family constitution (with template outline) · Family council vs board of directors · Family employment policy: who can work in the business · How to run a family meeting · Resolving sibling conflict in a family business |
| Professionalizing the Business | professionalizing a family business | Hiring your first non-family CEO · Separating family and business finances · Setting up an independent board · KPIs every family business should track |
| Next-Gen Leadership | next generation leadership in family business | Should the next generation work outside the business first? · Building a next-gen development plan · Preparing heirs for ownership, not just management |
| Legacy in Action | Legacy in Action book / family business podcast | Episode pages with full transcripts · Book chapter summaries · Guest Q&A pages |

**Publishing rate:** two cluster articles a month at minimum, each 1,200 words or more and each with its own brief in the form. Twelve good articles beat forty thin ones.

---

## 4. AEO: being the answer

Answer engines pull passages, not pages. They favour content that is **easy to extract, clearly attributed, and repeated by other sources**. The form checks every item below.

1. **Answer first.** Put a 40–60 word direct answer right under the H1 or under each question-style H2. Write it so it still makes sense quoted alone, with no "as mentioned above".
2. **Headings phrased as the question people ask.** "How long does family business succession take?" beats "Timeline".
3. **An FAQ block on every service page**, marked up with FAQPage schema. Use real questions from sales calls, People Also Ask, AlsoAsked and AnswerThePublic.
4. **Lists, steps and tables.** Engines lift structured passages more reliably than long paragraphs. Use HowTo on the Approach page.
5. **Stats with sources.** A claim like "Only X% of family businesses reach the third generation" must link to its source. Original data is better still (see §7, the annual survey).
6. **Consistent entities.** Write the firm name, founder, credentials, city and partner organisations exactly the same way everywhere: site, schema, LinkedIn, Google Business Profile, directories. LLMs build their picture of Premier from that consistency. Use `sameAs` links in Organization and Person schema.
7. **A named author and reviewer on every page.** Byline, credentials, a link to the person's profile page and a "Last reviewed" date. Refresh key pages every 6–12 months and update the date only when content really changed.
8. **Be mentioned off-site.** AI answers lean heavily on third-party sources: LinkedIn articles, podcast show notes, industry publications, Reddit and Quora threads, directories. See §7.
9. **Let AI crawlers in.** In `robots.txt`, allow `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Google-Extended` (Gemini), `Bingbot` and `ClaudeBot`. Blocking them removes Premier from those answers. An `llms.txt` file is cheap to add, but no major engine has confirmed it uses one, so treat it as optional.
10. **Track it.** Once a month, ask ChatGPT, Perplexity, Gemini and Google AI Mode the 20 target questions and log whether Premier is cited. Automate this later with an AI-visibility tool (§9).

---

## 5. On-page standard (what the form scores)

| Element | Standard |
|---|---|
| SEO title | 30–60 characters, primary keyword near the start, brand at the end: `Family Business Succession Planning \| Premier` |
| Meta description | 120–160 characters, includes the primary keyword and a reason to click. Written by hand for every page. |
| URL | Short, lowercase, hyphenated, contains the core of the primary keyword, no dates |
| H1 | One per page, contains the primary keyword, reads naturally |
| First 100 words | Contain the primary keyword and the direct answer |
| Body length | Home/About 600+, service pillars 1,200+, articles 1,200+, contact 300+ |
| Keyword use | Primary at about 0.5–2.5% density, never stuffed. Work in secondary keywords and entities naturally. |
| Readability | Average sentence 22 words or fewer, no paragraph over 120 words |
| Internal links | 3 or more, descriptive anchors (never "click here"), always one to Book a Family Business Review |
| External links | 1 or more authoritative sources (FFI, academic, government statistics) |
| Images | Descriptive file names (`family-council-meeting.jpg`, never `hf_20260909_...`), written alt text, WebP, lazy-loaded below the fold |
| Schema | Organization + ProfessionalService site-wide, plus the page type (Service, FAQPage, Article, HowTo, Person, Event, Book) |

---

## 6. Technical SEO for the WordPress/Elementor build

- **Speed:** targets are mobile PageSpeed 70+, LCP under 2.5 s, CLS under 0.1, INP under 200 ms. Elementor is heavy, so enable its performance experiments (Optimized DOM output, Improved asset loading and CSS loading, Lazy-load background images). Serve the hero film with a lightweight poster frame and never autoplay it on mobile data. Add a caching plugin (WP Rocket, or the host's built-in cache) and **Cloudflare** in front for a global CDN, which matters because visitors abroad are far from a Philippine server.
- **Hosting:** use a managed host with data centres or CDN edge in Singapore/Asia **and** the US/EU (Kinsta, WP Engine, Cloudways).
- **International setup:** keep one English `.com` site. Don't set a country target and don't geo-redirect visitors. Add `hreflang` only when a real translated version exists (e.g. Traditional Chinese or Bahasa later). Hreflang on a single-language site does nothing.
- **Indexing:** thin pages (tag archives, author archives with one post, attachment pages) get `noindex`. Every page has a self-referencing canonical. Breadcrumbs are on, with BreadcrumbList schema.
- **Validate:** run every template through the Rich Results Test and the Schema Markup Validator before launch, then crawl the whole staging site with Screaming Frog.

---

## 7. Authority: links and mentions from outside the site

| Source | What to do |
|---|---|
| **Family Firm Institute** | Make sure Jon's and each certified consultant's FFI profiles link to the site. Pitch articles to FFI Practitioner. |
| **FBN Asia, UA&P and other partners** | Ask for a partner/member listing with a link. Co-author one resource a year. |
| **Industry publications** | Pitch bylined articles to Tharawat Magazine, Campden FB, Family Business Magazine and the *Asian Family Business* sections of regional outlets. |
| **Philippine and Asian business press** | BusinessWorld, Philippine Daily Inquirer, Philstar, SunStar Cebu, Rappler, Nikkei Asia, The Business Times (SG). Offer Jon as the expert on succession stories. |
| **Journalist request platforms** | Qwoted, Featured.com and Source of Sources: answer family business and succession queries weekly. |
| **Podcasts** | Guest on family business, wealth and entrepreneurship podcasts. Every appearance earns a show-notes link and more mentions for AI answers to draw on. |
| **Linkable asset** | An annual **"State of Family Business in the Philippines / Southeast Asia"** survey. Original data is the single strongest way to earn links and AI citations. Publish the results page with charts, a methodology section and a downloadable PDF. |
| **Events** | Every roadshow, forum and webinar gets its own page with Event schema, and a recap article with photos afterwards. Ask hosts and co-organisers to link to it. |
| **Directories and profiles** | Google Business Profile (Cebu HQ, and Manila if there is a real office), LinkedIn company page, Clutch/Sortlist-style consulting directories, chamber of commerce listings (PCCI, Cebu Chamber, and FFCCCII given the Filipino-Chinese audience). Keep name, address and phone identical everywhere. |
| **LinkedIn** | Jon and the senior consultants republish each article's key idea as a native LinkedIn post that links back. LinkedIn content is heavily cited by AI answer engines. |
| **Reviews** | Ask satisfied families (with permission and discretion) for Google reviews and a written testimonial. Add Review schema only for reviews shown on the page. |

---

## 8. Content calendar starter (first 12 briefs after launch)

| # | Working title | Primary keyword | Pillar |
|---|---|---|---|
| 1 | How to Create a Family Business Succession Plan: A Step-by-Step Guide | how to create a succession plan for a family business | Succession |
| 2 | What Is a Family Constitution? Structure, Examples and How to Write One | family constitution | Governance |
| 3 | Family Council vs Board of Directors: What Each One Does | family council vs board of directors | Governance |
| 4 | Why Most Family Businesses Don't Survive to the Third Generation | family business third generation | Succession |
| 5 | When Should a Founder Start Succession Planning? | when to start succession planning | Succession |
| 6 | How to Prepare the Next Generation to Lead the Family Business | preparing next generation family business | Next-Gen |
| 7 | Hiring a Non-Family CEO: A Guide for Family Business Owners | non-family CEO family business | Professionalizing |
| 8 | Succession in Filipino-Chinese Family Businesses: What Is Different | Filipino-Chinese family business succession | Succession |
| 9 | Family Employment Policy: Rules for Hiring Relatives | family employment policy | Governance |
| 10 | How Much Does Family Business Consulting Cost? | family business consultant cost | Home/Approach |
| 11 | How to Run a Productive Family Meeting (Agenda Template) | family meeting agenda | Governance |
| 12 | Separating Family and Business Finances | separating family and business finances | Professionalizing |

Once a real fee range is approved, #10 answers the category's most-asked question. Don't dodge it.

---

## 9. Tools

| Job | Free | Paid (pick one per row) |
|---|---|---|
| Rankings, clicks and indexing | Google Search Console, Bing Webmaster Tools | n/a |
| Traffic and conversions | Google Analytics 4, Microsoft Clarity (heatmaps, recordings) | n/a |
| Keyword research | Google Keyword Planner, Google Trends, AnswerThePublic (limited), AlsoAsked (limited), Ahrefs Webmaster Tools | Semrush or Ahrefs, the main all-in-one choice |
| Content optimisation | Hemingway Editor, this form | Surfer, Clearscope or Frase |
| On-site SEO plugin | Rank Math (free) | Rank Math Pro (adds schema templates, multiple focus keywords and a keyword tracker) |
| Technical crawl | Screaming Frog (free up to 500 URLs) | Screaming Frog licence, Sitebulb |
| Speed | PageSpeed Insights, Chrome Lighthouse | WP Rocket, Cloudflare Pro/APO |
| Schema | Rich Results Test, Schema Markup Validator | Rank Math Pro |
| AI answer visibility | Manual monthly check (§4.10), Bing Webmaster Tools AI performance report | Semrush AI Toolkit, Ahrefs Brand Radar, Otterly.ai, Profound or Peec AI |
| PR and mentions | Google Alerts, Qwoted (free tier) | Featured.com, Muck Rack |
| Local | Google Business Profile | BrightLocal |

A lean stack to start: **Search Console + Bing Webmaster Tools + GA4 + Clarity + Rank Math Pro + Semrush (or Ahrefs) + Screaming Frog**. Add an AI-visibility tracker once there are 20 or more published articles.

---

## 10. Workflow: brief → write → publish

1. **Strategist** opens the page in the SEO brief form, confirms the primary keyword (after checking volume) and fills in Keywords, Search appearance and the outline.
2. **Writer** drafts in Google Docs against the brief. They paste the draft into *Body copy* and fix everything the score panel flags until it shows **80% or more** with no red items.
3. **Expert reviewer** (Jon or a senior consultant) checks the facts and signs off. Their name and date go in the *Author & review* fields.
4. **Web editor** builds the page in Elementor, pastes the title and meta into Rank Math, adds the JSON-LD from the form's *Schema* tab (or enables the matching Rank Math schema), and ticks the Technical checklist.
5. **After publish:** request indexing in Search Console, submit to Bing via IndexNow, share on LinkedIn, and set the brief status to *Published*.
6. **Monthly:** review Search Console queries for each page, and add any new questions people are searching to that page's FAQ.

---

## 11. What to measure

These are directional targets to calibrate after the first three months of real data.

| KPI | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Pages with brief score 80% or more | all launch pages | all pages | all pages |
| Published cluster articles | 6 | 12 | 24+ |
| Search Console: queries with impressions | baseline | 2× baseline | 5× baseline |
| Non-Philippine share of organic clicks | baseline | +10 pts | +20 pts |
| Referring domains (Ahrefs/Semrush) | baseline | +15 | +40 |
| Target questions where an AI engine cites Premier (of 20) | baseline | 3 | 8 |
| Book a Review form submissions from organic | baseline | up | up |

---

## 12. 90-day roadmap

**Days 1–30 (foundation):** fix or replace the broken live site · redirect map · Search Console + Bing + GA4 + Clarity · Rank Math configured · Organization/ProfessionalService schema · Google Business Profile claimed and completed · briefs filled in for Home, Succession and the three other service pages.

**Days 31–60 (launch and content):** launch the new site from staging · validate schema and speed · briefs for every remaining page · first four cluster articles · author profile pages live · partner and FFI profile links requested.

**Days 61–90 (authority):** four more articles · two bylined external articles pitched · two podcast guest spots · design the annual survey · first monthly AI-visibility check logged · review Search Console and update FAQs.
