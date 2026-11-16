# Premier Visibility

The team's control room for **https://premierfamilybusiness.com**, running on **Cloudflare** (Workers free plan):

- **https://visibility.premierfamilybusiness.com**: the public visibility report. No sign-in.
- **https://visibility.premierfamilybusiness.com/admin/**: the team app, behind Cloudflare Access.

| Area | What it records |
|---|---|
| **SEO & AEO briefs** | The brief for every page (keywords, title, meta, H1, direct answer, FAQs, schema, links). Each save becomes a numbered version with who changed what, a line-by-line diff, the score before and after, and one-click restore. |
| **Live page tracking** | Each page is fetched as Google would see it, about once a day: title, meta description, robots/noindex, canonical, H1s, H2s, JSON-LD schema types, word count, links and alt text. A snapshot is stored whenever something changes. Differences from the approved brief show as "drift", and critical regressions (noindex added, page erroring, title removed) send an alert. |
| **Uptime & maintenance** | A check every 5 minutes **from Cloudflare's network**, so it keeps working when the website's server is down. WordPress "critical error" pages count as down even when they return HTTP 200. An incident opens after two failures in a row, with alerts on down and recovery. Planned maintenance windows mute alerts, and a maintenance log keeps the record. |
| **Plugins & updates** | WordPress core, PHP, theme and every plugin with installed vs available version, read daily through the connector plugin. New updates trigger an alert. When a version changes, the app writes it to the maintenance log automatically. |
| **Public report** | The home page (`/`, also `/report`): uptime, incidents and page readiness for anyone. No plugin versions, brief contents or team details. |

## How it's built

| Piece | Cloudflare product (free plan) |
|---|---|
| App + API | Worker `premier-visibility` (`worker/src/`), with the web app's files from `public/` bundled in |
| Database | D1 `premier-visibility` (APAC), schema in `worker/migrations/` |
| Schedules | Cron Triggers: `*/5 * * * *` (uptime + one page audit), `0 22 * * *` (WordPress status, pruning; 06:00 Manila) |
| Sign-in | Cloudflare Access app "Premier Visibility" (email one-time PIN) on `/admin` and `/api`, allowing **ghamaypepito@gmail.com**. Everything else is public. |
| Domain | Workers custom domain `visibility.premierfamilybusiness.com` (no `*.workers.dev` address) |

To stay inside the free plan's CPU limit per request, page audits run one or two at a time (the 5-minute cron audits the page checked longest ago; "Check all live pages" loops in small batches), and long-range uptime comes from a daily rollup table rather than raw checks.

```
visibility/
  worker/src/          index.js (router, cron), api.js, auth.js (Access JWT), monitor.js, audit.js (HTMLRewriter), wp.js, notify.js, report.js
  worker/migrations/   D1 schema
  public/              web app (HTML/CSS/JS), bundled into the Worker at build time
  public/js/rules.js   SEO/AEO scoring rules (browser); starting briefs are generated from it
  wp-connector/        the read-only WordPress plugin
  test/                end-to-end tests in Cloudflare's local runtime against a fake WordPress site
```

## Everyday admin

- **Add a team member:** Cloudflare → Zero Trust → Access → Applications → *Premier Visibility* → edit the policy → add their email. Then in the app, Settings → Team to set their role (admin, editor, viewer). New people default to editor.
- **Alerts:** add a Slack webhook and/or a [Resend](https://resend.com) API key (free tier) as Worker secrets, then use Settings → *Send test alert*:
  `npx wrangler secret put SLACK_WEBHOOK_URL`, `npx wrangler secret put RESEND_API_KEY`, and optionally `ALERT_FROM` (needs the domain verified in Resend). Alert recipients are edited in Settings.
- **WordPress connector:** install `dist/premier-visibility-connector.zip` in WordPress, then copy the `define( 'PREMIER_VISIBILITY_KEY', … )` line shown in the app under Settings (admins only) into `wp-config.php`.

## Deploy

Needs a Cloudflare API token with Workers Scripts, D1, Access: Apps and Policies, Account Settings (read), Workers Routes and DNS for the zone.

```bash
cd visibility
npm install
npm test                                   # end-to-end tests (local Workers runtime + local D1)
npx wrangler d1 migrations apply DB --remote   # only when a new migration is added
npm run deploy                             # builds, then wrangler deploy
```

`wrangler.toml` holds the D1 id, the Access team domain and the Access application audience (`ACCESS_AUD`). The API rejects any request without a valid Access token for that audience.

## Local development

```bash
npm run dev    # http://localhost:8787 (report) and /admin/ (app) with a local D1; set DEV_AUTH_EMAIL in .dev.vars to skip Access locally
```
`DEV_AUTH_EMAIL` must never be set on the deployed Worker.

## Security notes
- `/admin` and `/api` sit behind Cloudflare Access; the Worker also verifies the Access JWT (signature, audience, issuer, expiry) on every API call. The public report is the only other page.
- Cross-site writes are refused. Responses carry `noindex` and frame-blocking headers.
- The public report is cached for 5 minutes and shows only aggregate health.
- Admins can download all data as JSON from Settings.
