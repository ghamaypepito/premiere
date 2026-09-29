# Premier Visibility

The team's control room for **visibility.premierfamilybusiness.com**. It tracks four things:

| Area | What it records |
|---|---|
| **SEO & AEO briefs** | The brief for every page (keywords, title, meta, H1, direct answer, FAQs, schema, links). Each save becomes a numbered version with who changed what, a line-by-line diff, the score before and after, and one-click restore. |
| **Live page tracking** | Once a day, each page is fetched as Google would see it: title, meta description, robots/noindex, canonical, H1s, H2s, JSON-LD schema types, word count, links and alt text. A snapshot is stored whenever something changes. Differences from the approved brief show as "drift", and critical regressions (noindex added, page erroring, title removed) send an alert. |
| **Uptime & maintenance** | A check every 5 minutes. WordPress "critical error" pages count as down even if they return HTTP 200. An incident opens after two failures in a row, with alerts on down and recovery. SSL expiry is checked daily. Planned maintenance windows mute alerts, and a maintenance log keeps the record. |
| **Plugins & updates** | WordPress core, PHP, theme and every plugin with installed vs available version, active and auto-update state, and security flags. New updates trigger an alert. When a version changes, the app writes it to the maintenance log automatically. |

Alerts go to **Slack** and/or **email**, and every attempt is logged under Settings.

```
visibility/
  api/index.js            Vercel function; every /api/* request lands here
  lib/                    routes, database, auth, uptime, live audit, WordPress, alerts
  db/schema.sql           Postgres schema, applied automatically on start
  public/                 the web app (plain HTML/CSS/JS, no build step)
  public/js/rules.js      the SEO/AEO scoring rules, shared by browser and server
  wp-connector/           the read-only WordPress plugin
  test/api.test.js        end-to-end API tests against a fake WordPress site
  dev.js                  local server with an on-disk database
```

---

## Deploy (about 30 minutes)

### 1. Vercel project
1. In Vercel, **Add New → Project** and import `ghamaypepito/premiere`.
2. Set **Root Directory** to `visibility`, and **Framework Preset** to **Other**. The build and output settings come from `vercel.json`.
3. **Plan:** the 5-minute uptime schedule needs Vercel **Pro**. Hobby only runs scheduled jobs once a day, and Vercel's Hobby terms don't allow commercial use. On Hobby instead:
   - remove the `/api/cron/uptime` entry from `vercel.json`, and
   - create a free job at [cron-job.org](https://cron-job.org) that calls `https://visibility.premierfamilybusiness.com/api/cron/uptime` every 5 minutes with the header `Authorization: Bearer <CRON_SECRET>`.

### 2. Database
In the Vercel project, open **Storage → Create → Neon (Postgres)**, pick the **Singapore** region (closest to Cebu) and connect it to the project. Vercel adds `DATABASE_URL` for you. The free tier is plenty. Tables are created and seeded on first request.

### 3. Environment variables
Project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | 40+ random characters (`openssl rand -base64 48`) |
| `CRON_SECRET` | 32+ random characters. Vercel sends it to the scheduled jobs automatically. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | The first admin account, created on first sign-in. Change the password afterwards in Settings. |
| `SITE_URL` | `https://premierfamilybusiness.com` |
| `APP_URL` | `https://visibility.premierfamilybusiness.com` (goes into alert messages) |
| `WP_CONNECTOR_KEY` | Same value as `PREMIER_VISIBILITY_KEY` in wp-config.php (step 6) |
| `SLACK_WEBHOOK_URL` | Optional. A Slack incoming-webhook URL for the alerts channel. |
| `RESEND_API_KEY`, `ALERT_FROM`, `ALERT_EMAILS` | Optional. Email alerts through [Resend](https://resend.com), e.g. `ALERT_FROM="Premier Visibility <alerts@premierfamilybusiness.com>"`. Add Resend's DNS records so mail from the domain is delivered. Alert recipients can also be edited in Settings. |

Redeploy after adding them.

### 4. The subdomain
1. Vercel project → **Settings → Domains** → add `visibility.premierfamilybusiness.com`.
2. At whoever hosts the DNS for premierfamilybusiness.com (the registrar, Cloudflare or the web host), add the record Vercel shows. It is normally:
   `CNAME  visibility  →  cname.vercel-dns.com`
   If the DNS is on Cloudflare, set that record to **DNS only** (grey cloud).
3. Vercel issues the SSL certificate automatically, usually within minutes.

The main WordPress site is untouched: only the `visibility` subdomain points to Vercel.

### 5. First sign-in
Open the subdomain and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Then:
- change your password (Settings)
- add the team (Settings → Team). **Editors** edit briefs and log work, **viewers** read only.
- press **Send test alert** to confirm Slack/email arrive
- press **Run the daily check now** to take the first live snapshots

### 6. WordPress connector (for plugins & updates)
1. Zip `wp-connector/premier-visibility-connector/`, then upload it under **Plugins → Add New → Upload** (staging first) and activate it.
2. Add this to `wp-config.php`, using a long random value:
   `define( 'PREMIER_VISIBILITY_KEY', 'the-same-value-as-WP_CONNECTOR_KEY' );`
3. In the app, open **Plugins & updates → Check now**.

The connector only reads: it reports versions and pending updates and never installs or changes anything. Requests without the key are refused.

---

## Scheduled jobs

| Job | When | Does |
|---|---|---|
| `/api/cron/uptime` | every 5 min | checks each monitor, opens/closes incidents, alerts |
| `/api/cron/daily` | 22:00 UTC (06:00 in Manila) | SSL expiry, WordPress status, live SEO snapshot of every page, prunes checks older than 120 days |

Admins can run the daily job any time from Settings.

## Local development

```bash
cd visibility
npm install
npm run dev        # http://localhost:3000, sign in as admin@example.com / change-me-please
npm test           # API tests against an in-memory database and a fake WordPress site
```

With no `DATABASE_URL`, the app uses PGlite (Postgres in WebAssembly) stored in `.data/`.

The SEO/AEO scoring rules live in `public/js/rules.js`. They are extracted from `seo/brief.src.html`, so change both if you change a rule. The playbook is copied from `seo/SEO-AEO-PLAYBOOK.md` at build time.

## Security notes
- Every page and API route requires sign-in, except `/api/login` and the scheduled jobs (which require `CRON_SECRET`).
- Passwords are hashed with scrypt. Five wrong attempts lock the account for 15 minutes.
- Sessions are signed, HttpOnly, SameSite=Lax cookies. Cross-site writes are refused.
- The app sends `X-Robots-Tag: noindex` so the subdomain never shows up in search.
- Admins can download all data as JSON from Settings. Neon also keeps point-in-time backups.
