# Premier Visibility

The team's control room for the Premier WordPress site, hosted on **Hostinger** at **https://visibility.premierfamilybusiness.com** (or, without a subdomain, at `premierfamilybusiness.com/visibility/`). It tracks four things:

| Area | What it records |
|---|---|
| **SEO & AEO briefs** | The brief for every page (keywords, title, meta, H1, direct answer, FAQs, schema, links). Each save becomes a numbered version with who changed what, a line-by-line diff, the score before and after, and one-click restore. |
| **Live page tracking** | Once a day, each page is fetched as Google would see it: title, meta description, robots/noindex, canonical, H1s, H2s, JSON-LD schema types, word count, links and alt text. A snapshot is stored whenever something changes. Differences from the approved brief show as "drift", and critical regressions (noindex added, page erroring, title removed) send an alert. |
| **Uptime & maintenance** | A check every 5 minutes. WordPress "critical error" pages count as down even when they return HTTP 200. An incident opens after two failures in a row, with alerts on down and recovery. SSL expiry is checked daily. Planned maintenance windows mute alerts, and a maintenance log keeps the record. |
| **Plugins & updates** | WordPress core, PHP, theme and every plugin with installed vs available version, active and auto-update state, and security flags. New updates trigger an alert. When a version changes, the app writes it to the maintenance log automatically. |

Alerts go to **Slack** and/or **email**, and every attempt is logged under Settings.

It is plain **PHP 8.1+ and MySQL**, so it runs on any Hostinger web or WordPress hosting plan. It needs no Node.js and no build step on the server.

```
visibility/
  public/                 ← everything that goes on the server (zipped into dist/)
    index.html, css/, js/ the web app (hash-routed, works at a subdomain root or in a subfolder)
    api/index.php         JSON API front controller (api/index.php?r=/pages)
    app/                  PHP code, config, cron script. .htaccess blocks all web access.
      config.sample.php   copy to config.php and fill in
      cron.php            run by hPanel Cron Jobs
  wp-connector/           the read-only WordPress plugin
  dist/                   ready-to-upload zips (npm run package)
  scripts/, test/         build, local server, end-to-end tests
```

---

## Install on Hostinger (about 30 minutes)

### 1. The subdomain (hPanel + Cloudflare)
The domain's DNS is on Cloudflare, so the subdomain needs a step in each.

1. **hPanel** → Websites → premierfamilybusiness.com → **Domains → Subdomains** → create `visibility`. Note the folder hPanel makes for it (usually `public_html/visibility`).
2. **hPanel** → the same site's **Dashboard** → note the website's **IP address** (also under Advanced → DNS Zone, or Hosting → Details).
3. **Cloudflare** → premierfamilybusiness.com → **DNS → Records → Add record**: Type `A`, Name `visibility`, IPv4 address = the IP from step 2, Proxy status **DNS only (grey cloud)** for now.
4. **hPanel** → **Security → SSL** → install the free SSL certificate for `visibility.premierfamilybusiness.com`. It can take up to an hour.
5. Once https works, switch the Cloudflare record to **Proxied (orange cloud)**. Keep SSL/TLS mode **Full (strict)** (or Full).

No subdomain? Upload to `public_html/visibility/` and use `https://premierfamilybusiness.com/visibility/` instead; the app works in a folder without changes.

### 2. Create the database
hPanel → **Databases → Management** → create a MySQL database and user (e.g. `u123456789_visibility`). Keep the name, user and password handy. The tables are created automatically on first use.

### 3. Upload the app
1. hPanel → **Files → File Manager** → open the subdomain's folder from step 1.
2. Upload `dist/premier-visibility-hostinger.zip`, right-click it → **Extract** into that folder. `index.html`, `setup.php`, `api/` and `app/` must sit directly in it.

### 4. Run the setup page
Open **https://visibility.premierfamilybusiness.com**. It sends you to a one-time setup form: enter the database name, user and password from step 2, your name, email and password, and optional alert emails or a Slack webhook. It writes `app/config.php` with freshly generated secrets, creates the tables and your admin account, then shows your cron commands and the WordPress connector key. The page refuses to run again once setup is done, so finish it straight after uploading.

To change settings later, edit `app/config.php` in File Manager (`config.sample.php` documents every option). Once signed in:
- add the team (Settings → Team). **Editors** edit briefs and log work, **viewers** read only.
- press **Send test alert**
- press **Run the daily check now** to take the first live snapshots

### 5. Scheduled checks
hPanel → **Advanced → Cron Jobs** → create two jobs. Take the full folder path from File Manager: it looks like `/home/u123456789/domains/premierfamilybusiness.com/public_html/visibility`.

| Schedule | Command |
|---|---|
| Every 5 minutes (`*/5 * * * *`) | `/usr/bin/php /home/u123456789/domains/premierfamilybusiness.com/public_html/visibility/app/cron.php uptime` |
| Once a day (e.g. `0 22 * * *`, which is 06:00 Manila time if the server clock is UTC) | `/usr/bin/php /home/u123456789/domains/premierfamilybusiness.com/public_html/visibility/app/cron.php daily` |

Settings → Alerts shows when each job last ran, so you can confirm they're working.

> **Watch the watcher.** The monitor runs on the same Hostinger account as the site. If the whole server goes down, it can't send the "down" alert. Add a free check at [healthchecks.io](https://healthchecks.io) (period 5 min, grace 10 min) and put its ping URL in `HEARTBEAT_URL`. The uptime job pings it every run, and healthchecks.io emails you if the pings stop. Adding a free outside monitor such as UptimeRobot on the home page is also sensible.

### 6. WordPress connector (plugins & updates)
1. WordPress admin → **Plugins → Add New → Upload** → `dist/premier-visibility-connector.zip` → activate.
2. File Manager → the WordPress site's `wp-config.php` → add, above "That's all, stop editing":
   `define( 'PREMIER_VISIBILITY_KEY', 'a-long-random-string-24-plus-characters' );`
3. Put the same value in the app's `config.php` as `WP_CONNECTOR_KEY`.
4. In the app: **Plugins & updates → Check now**.

The connector only reads: it reports versions and pending updates and never installs or changes anything. Requests without the key are refused.

### 7. Check robots.txt first
Live checks on 16 November 2026 found that `https://premierfamilybusiness.com/robots.txt` ends with `User-agent: Googlebot / Disallow: /` and `User-agent: * / Disallow: /`, which stops Google from crawling the whole site. Remove those lines in WordPress (Settings → Reading: untick "Discourage search engines"; Rank Math → General Settings → Edit robots.txt; or a physical `robots.txt` in `public_html`), purge the Cloudflare cache, and request a recrawl in Search Console.
---

## Updating the app
Run `npm run package`, then upload the new zip and extract it over the old files. `app/config.php` and the database are not in the zip, so they stay untouched.

## Local development
Needs PHP 8.1+ (with pdo_sqlite) and Node 20+ for the build and tests.
```bash
cd visibility
npm run dev        # http://localhost:3000 with SQLite; sign in as admin@example.com / change-me-please
npm test           # end-to-end tests: PHP built-in server + SQLite + a fake WordPress site
npm run package    # dist/premier-visibility-hostinger.zip and dist/premier-visibility-connector.zip
```
The SEO/AEO scoring rules live in `public/js/rules.js` and run in the browser; the server stores the score computed at save time. The starting briefs (`app/seed-pages.json`) and the playbook (`app/playbook.md`, from `seo/SEO-AEO-PLAYBOOK.md`) are generated by `npm run build`.

## Security notes
- All data and the playbook require sign-in. `app/` (config, code, cron) is blocked from the web by `.htaccess`, and `config.php` prints nothing even if requested.
- Passwords are hashed with bcrypt. Five wrong attempts lock the account for 15 minutes.
- Sessions are signed, HttpOnly, SameSite=Lax cookies. Cross-site writes are refused.
- The app sends `noindex` headers and a `robots.txt` that disallows everything.
- Admins can download all data as JSON from Settings. Hostinger's daily backups include the database.

## Cloudflare
The site runs behind Cloudflare. The API answers with `Cache-Control: no-store` and PHP isn't cached by default, so nothing extra is needed. After uploading a new version, purge the Cloudflare cache so browsers get the new JavaScript and CSS.
