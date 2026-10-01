# Premier Family Business Consulting — working rules

## Before any change that will be published: ask for the website data first

The client has edit access to WordPress and edits the live site directly.
The build script is not the only author any more.

So, every time, before changing the build and before telling anyone to
publish:

1. **Ask the user for a fresh export.** wp-admin → Tools → Export → All
   content → Download Export File. Do not skip this because an export
   already exists — it goes stale the moment the client opens Elementor.
2. `node wp-build/sync/from-wxr.js <export.xml>` to rebuild
   `wp-build/sync/pulled/`.
3. `node wp-build/sync/compare.js` to see what WordPress holds that the
   build does not.
4. Port anything the client changed into the build, then publish.

Publishing overwrites whole pages. An edit that is not in the build at
publish time is destroyed, with no undo beyond Elementor's own revisions.

This has already caught two live edits that a republish would have wiped.

## Publishing is browser-only

Claude cannot publish. Verified, not assumed: `wp-json/wp/v2/users/me`
returns the identical `rest_not_logged_in` with a wrong credential and
with none at all, so Hostinger's CDN strips the Authorization header
before WordPress sees it. `_elementor_data` is protected meta and is
excluded from REST regardless. SSH has never connected.

The only working path is pasting the build scripts into the browser
console of a logged-in wp-admin session — which means the user does it.

Order matters:
1. `wp-build/premier-theme-parts.txt` — header and footer templates
2. `wp-build/premier-elementor-build.txt` — the seventeen pages

Each build prints a `BUILD_ID` so it is possible to tell which file
actually ran. Always quote the expected one when giving publish steps.

## Live URLs are nested

Several pages 301 to a nested permalink
(`/what-we-do/family-enterprise-planning/`,
`/who-we-are/our-team/ma-theresa-ramos/`). Use `curl -L` when checking
the live site, or a flat-slug fetch silently returns an empty body and
reads as a change that is not there.

## Facts are not copy

Positioning language can be rewritten freely. The factual record cannot:
office address and phone numbers, milestone dates and cities, credentials
and universities, job titles, book launch details, and client quotes.
Rewriting those is invention, not editing.
