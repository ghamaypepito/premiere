# The wider estate

Three hosts, as given:

| | Host | Reachable from here |
|---|---|---|
| Main website | `premierfamilybusiness.com` | yes |
| SEO | `visibility.premierfamilybusiness.com` | **no — proxy denied** |
| Ticketing | `ticket.premierfamilybusiness.com` | **no — proxy denied** |

The two subdomains are blocked by this environment's network policy, not
necessarily down. Nothing below describes them; they are unexamined.

## What production actually is

Verified by reading its public API, not assumed.

- **WordPress 7.1.2** behind **Cloudflare**
- Front page is post **1197**, not 27
- **The Events Calendar** (`tribe/*`, `tec/*`) — events, venues, organizers
- **HubSpot** (`leadin/v1`) — the CRM behind the HubSpot links in the bio deck
- **Contact Form 7**
- A `portfolio` post type
- WooCommerce and WP Booking Calendar **pages** exist (`shop`, `cart`,
  `checkout`, `my-account`, `wpbc-*`) but neither exposes a REST namespace,
  so both appear deactivated, leaving the pages behind as orphans

## The gap nobody has costed yet

|  | Production | Staging redesign |
|---|---:|---:|
| Pages | **67** | 17 |
| Posts | **91** | 4 |
| Media | **1086** | 70 |

The redesign is a brochure site. Production is a brochure site plus a blog,
an events system, a CRM, lead-generation funnels, and the remains of a shop
and a booking calendar.

**The 91 posts are the exposure.** They are the site's organic search surface,
accumulated over years. The redesign has four. If the redesign replaces
production as it stands, that surface disappears along with every link
pointing at it.

Everything else is tractable. This one decides whether the launch costs
traffic.

## What a cutover has to answer

Not blockers, but none of them answer themselves:

1. **The 91 posts** — migrate, or keep and restyle? Either way their URLs must
   survive or redirect.
2. **Post IDs do not map.** Home is 27 on staging and 1197 on production. The
   build's `PAGES` array and every `__onlyPages` id is staging-only and must be
   remapped before it is ever pointed at production.
3. **Redirects for ~50 pages** the redesign has no equivalent of — the
   `legacy-of-*` series, the landing and opt-in pages, old team pages. Each one
   is either a redirect or a 404 that used to rank.
4. **The Events Calendar** currently holds zero events but is installed and
   presumably intended. The redesign's Events page is static copy.
5. **HubSpot** must keep working: forms, tracking, and the booking links.
6. **1086 media items.** The redesign references 70. The rest are attached to
   the posts and pages above.
7. **Orphaned commerce and booking pages** — delete, redirect, or revive.

## Where the redesign stands against this

The staging site is the brochure layer, and it is nearly done. Nothing above
makes it wrong; it makes it *partial*, which is only a problem if the cutover
is treated as a swap rather than a migration.

The honest sequencing: finish and sign off the brochure layer, then plan the
migration as its own piece of work with the seven questions above answered
before anything is pointed at the live domain.

## To examine the other two hosts

They need adding to this environment's allowed domains (the cloud environment
menu in the session title bar, then Edit — either a broader access level or
those hosts added). Until then I cannot see what the SEO and ticketing
platforms are, and should not guess.
