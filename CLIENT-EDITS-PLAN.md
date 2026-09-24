# Client edits — Southside Studio Mock Up v1 (24 Sep 2026)

Source: `Southside_Studio_Mock_Up_Version_1_with_edits.pdf`, 91 annotated pages, plus
`Consultant_Credentials_Bio_-_Slides.pdf`, 16 slides of consultant bios.

Status key: **Ready** — can be built now. **Needs input** — blocked on an asset, a URL or a
decision. **Flagged** — doable, but I think it costs more than it gives; see the note.

---

## A. Site-wide renames

The two biggest items. Both are page renames, not copy tweaks, and they touch the nav,
the footer, every cross-link, the slug and the schema.

| Now | Becomes | Source given |
|---|---|---|
| Premier IDEA | **Key Process Management Consulting** | premierfamilybusiness.com/key-process-management-consulting/ |
| Premier Leadership Institute | **Building Effective Governance** | premierfamilybusiness.com/building-effective-governance/ |

**Needs input.** Both source URLs are on the old production site, which this environment
cannot reach and which was returning a PHP fatal error when this project started. I need the
body copy for each page — paste it, or export the two pages to PDF, or get the old site
back up.

The rename itself is mechanical and I can do it today: `LINK.idea` → `LINK.kpmc`,
`LINK.pli` → `LINK.beg`, slugs `/what-we-do/premier-idea/` →
`/what-we-do/key-process-management-consulting/`, nav and footer labels, and 301 redirects
from the old slugs. What I cannot do is invent the page content.

### "Schedule a call" → "Let's Talk about the Future"

Appears on 27 buttons. A global rename, plus the header CTA and the exploratory-call
sections (p24: "Let's Talk About the Future — Together."). **Ready.**

---

## B. Homepage

| # | Change | Status |
|---|---|---|
| p3 | Logo larger in the header | Ready |
| p3 | Nav item "What we do" → "How We Help Families in Business" | Needs input — see Q3 |
| p6 | Remove hero eyebrow "FAMILY BUSINESS CONSULTING · PHILIPPINES" | Ready |
| p6 | Remove secondary button "Explore our programs"; emphasise the primary | Ready |
| p6 | Remove the Edward Hayco testimonial card | Ready |
| p6 | Replace hero photo with Sir Jon's family | Needs input — asset |
| p7 | "senior family business consultant" wording | Ready |
| p10 | Remove eyebrow "HOW WE CAN HELP" | Ready — but see Flag 1 |
| p10, p12 | Four program cards become a horizontal **slider** with arrows | Ready |
| p13 | Team section: keep the heading and paragraph, restyle as a row of **circular avatars**, each linking to that person's LinkedIn | Needs input — LinkedIn URLs |
| p14, p42 | "It Starts with a Conversation" section | Ready |
| p16 | Free Resource section — remove an element | Needs input — see Q4 |
| p17 | Phone number becomes a `tel:` link | Ready |
| p17 | Remove the "Schedule a call" button from the footer | Ready |

The footer email is already a `mailto:` link, so that request is satisfied.

---

## C. Who We Are

| # | Change | Status |
|---|---|---|
| p19 | Mission and vision copy as supplied | Ready |
| p21 | Life at Premier: drop the captions, show a **photo gallery / collage** instead | Ready |
| p23 | Partnership & Strategic Alliances, plus an **Affiliates** group | Needs input — logos and the full list |
| p24 | Exploratory call → "Let's Talk About the Future — Together." | Ready |

---

## D. Our Team

The biggest structural change on the site.

**Regroup into departments** (p26–p37): Administration and Executive · Client Relations and
Consulting · Finance and Accounting. The page is currently one flat grid of 25 people.

**Full profiles for everyone.** The Drive link in the deck is the credentials PDF that came
with it, so this is unblocked. It carries bios for 15 people; the site currently has profile
pages for only 3 (Jon, Neil, Theresa).

**Two consultants are missing from the site entirely:**

- **Atty. Darlon Serenio** — CPA, CMA, MBA, CFBA
- **Atty. Leandro Atienza** — JD

Portraits for both were extracted from the credentials deck at 2400×2400, the brand-yellow
backdrop replaced with the grey studio background the other 25 portraits use, and cropped to
the house 691×864 4:5 frame. Already committed at
`assets/team/web/atty-darlon-serenio.jpg` and `assets/team/web/atty-leandro-atienza.jpg`.

**LinkedIn buttons** on each profile (p26). Needs the URLs.

**Personal booking links** for Jon, Neil and Theresa (p28, p30, p32): either their own
HubSpot calendar or a direct email/phone link. HubSpot does support per-user meeting links,
so option 1 is achievable — I need the three URLs.

### Conflicts between the credentials deck and the live site

These are factual and I will not guess:

| Person | Site | Credentials deck |
|---|---|---|
| Neil | Montes**carlos** | Montes**claros** |
| Jefferson Tio | ROD**P** | ROD**C** (Registered Organizational Development Consultant), plus PhD (c) |
| Atty. Auman | Legal Affairs Manager | **Senior Partner, Ownership Planning and Chief Legal Affairs** |
| Marvin Soco | Relationship Manager | Relationship Manager – **VisMin** and Senior Consultant |
| Atty. Lagundi | Atty. Domingo Lagundi, CPA | Atty. Domingo Lagundi **Jr.**, CPA, **JD** |
| JR Hernandez | Relationship Manager, Luzon | Parenting and Relationship Coach / Brand Development Consultant |

RODC vs RODP looks like a typo on the live site and the deck is probably right. Auman's is a
large title change, not a correction. JR Hernandez's two descriptions are different jobs.

---

## E. What We Do / Family Enterprise Planning / OSE

| # | Change | Status |
|---|---|---|
| p41 | Programme list reflects the two renames | Blocked on A |
| p43 | Exploratory-call copy as supplied | Ready |
| p45 | "Let's Talk about the Future" | Ready |
| p46 | Embed the reel youtube.com/shorts/Uez9HnU6zkI on FEP | Ready |
| p50 | Remove "What You Walk Away With" — deck says consult Sir Jeff | Needs decision |
| p52 | Move FEP "Common Questions" into the FAQs page | Ready — but see Flag 2 |
| p55, p56 | New OSE intro copy, supplied verbatim | Ready |

---

## F. FAQs

- Restructure into four sections, one per programme: FEP, OSE, KPMS, BEG (p79–p82). The KPMS
  and BEG sections depend on A.
- p83: "Contact Us" opens a mail client addressed to info@premierfamilybusiness.com. **Ready.**

---

## G. Legacy in Action

| # | Change | Status |
|---|---|---|
| p87 | Second "Get Your Copy" points to forms.gle/Ev18CF11e88E9P4V6 for variety | Ready |
| p88 | Merge the two podcast sections | Ready |
| p90 | Remove "Setting your Legacy in Motion" | Ready — but see Flag 3 |

---

## Flags — doable, but worth a second look

**Flag 1 — removing the eyebrows.** The deck marks two for removal (p6, p10). There are 57
across the site. They carry the keyword line that sits above each heading ("SUCCESSION,
ESTATE AND GOVERNANCE"), which is doing real work for both scanning and search. Removing two
is fine. Removing all of them would flatten the hierarchy and drop keyword text that helps
these pages rank. **Question: the two marked, or all of them?**

**Flag 2 — moving FEP's questions to the FAQs page.** Those three questions carry the
FAQPage schema that makes the FEP page eligible for rich results in Google. Moving them
moves that eligibility to a page that is not the one you want people to land on. Suggestion:
**show them in both places** — keep them on FEP with the schema, and repeat them in the FAQs
page's FEP section. Duplicated copy across your own pages is not penalised; only the schema
must live in one place.

**Flag 3 — removing "Setting your Legacy in Motion."** That section is the only bridge from
the book to the consulting work — it links out to FEP, PLI/BEG and Events. Removing it makes
Legacy in Action a dead end. Suggestion: shorten it to a single row of three links rather
than deleting it.

**Flag 4 — the homepage slider.** Sliders reliably reduce engagement with everything past the
first panel, and the four programmes are the main conversion path. The current 2×2 grid shows
all four at once. Suggestion: keep the grid on desktop, use the slider on mobile, where it
genuinely helps. Happy to build the full slider if you would rather.

---

## What I need

1. Body copy for **Key Process Management Consulting** and **Building Effective Governance**
2. **LinkedIn URLs** for the consultants who should have them
3. **Sir Jon's family photo** for the hero
4. **HubSpot meeting links** for Jon, Neil and Theresa
5. **Partners and affiliates** — full list and logos
6. Rulings on the six credential conflicts in section D
7. Decisions on Flags 1–4 and on p50

---

## Build order

1. Renames and copy changes that need nothing from anyone — section A's rename mechanics,
   the "Let's Talk about the Future" rename, the homepage removals, `tel:` link, Legacy in
   Action links, OSE copy, FEP reel
2. Team page restructure, the two new consultants, department grouping, full bios
3. The slider, the circular-avatar team row, the Life at Premier gallery
4. KPMS and BEG pages once the copy arrives
5. FAQ restructure, schema updates, redirects from the retired slugs
