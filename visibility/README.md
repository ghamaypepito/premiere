# Premier Visibility

The team's control room for the Premier WordPress site, hosted on **Hostinger** as `visibility.<site>`. It tracks four things:

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

### 1. Create the subdomain
hPanel → **Websites** → the site's **Dashboard** → **Domains → Subdomains** → create `visibility`.
Note the folder hPanel creates for it (for example `public_html/visibility`).

> **Temporary domains:** `white-cassowary-123006.hostingersite.com` is a Hostinger temporary domain. If hPanel doesn't offer subdomains for it, pick one of these:
> - **Connect the real domain first** and create `visibility.premierfamilybusiness.com`. This is the cleaner long-term option.
> - **Use a folder instead:** upload to `public_html/visibility/` so the app lives at `https://white-cassowary-123006.hostingersite.com/visibility/`. The app works in a subfolder without changes.

Then hPanel → **Security → SSL** and make sure the subdomain has a certificate (Hostinger's free SSL, usually automatic).

### 2. Create the database
hPanel → **Databases → Management** → create a MySQL database and user (e.g. `u123456789_visibility`). Keep the name, user and password handy. The tables are created automatically on first use.

### 3. Upload the app
1. hPanel → **Files → File Manager** → open the subdomain's folder.
2. Upload `dist/premier-visibility-hostinger.zip`, right-click → **Extract** into that folder. `index.html` must sit directly in it, next to `api/` and `app/`.
3. In `app/`, copy `config.sample.php` to **`config.php`** and fill it in:
   - `DB_DSN`, `DB_USER`, `DB_PASS`: the database from step 2. The host is `localhost`.
   - `SITE_URL`: `https://white-cassowary-123006.hostingersite.com` (change it to the real domain at launch)
   - `APP_URL`: the address of this app
   - `SESSION_SECRET` and `CRON_SECRET`: long random strings
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`: the first admin account
   - Alerts: `SLACK_WEBHOOK_URL`, and/or `ALERT_EMAILS` + `RESEND_API_KEY` (most reliable), or `USE_PHP_MAIL` = `true` to send through Hostinger's mail
4. Make sure the subdomain uses **PHP 8.1 or newer**: hPanel → **Advanced → PHP Configuration**.

### 4. First sign-in
Open the app and sign in with the admin email and password from `config.php`. Then:
- change your password (Settings)
- add the team (Settings → Team). **Editors** edit briefs and log work, **viewers** read only.
- press **Send test alert**
- press **Run the daily check now** to take the first live snapshots

### 5. Scheduled checks
hPanel → **Advanced → Cron Jobs** → create two jobs. Take the full folder path from File Manager: it looks like `/home/u123456789/domains/<domain>/public_html/visibility`.

| Schedule | Command |
|---|---|
| Every 5 minutes (`*/5 * * * *`) | `/usr/bin/php /home/u123456789/domains/<domain>/public_html/visibility/app/cron.php uptime` |
| Once a day (e.g. `0 22 * * *`, which is 06:00 Manila time if the server clock is UTC) | `/usr/bin/php /home/u123456789/domains/<domain>/public_html/visibility/app/cron.php daily` |

Settings → Alerts shows when each job last ran, so you can confirm they're working.

> **Watch the watcher.** The monitor runs on the same Hostinger account as the site. If the whole server goes down, it can't send the "down" alert. Add a free check at [healthchecks.io](https://healthchecks.io) (period 5 min, grace 10 min) and put its ping URL in `HEARTBEAT_URL`. The uptime job pings it every run, and healthchecks.io emails you if the pings stop. Adding a free outside monitor such as UptimeRobot on the home page is also sensible.

### 6. WordPress connector (plugins & updates)
1. WordPress admin → **Plugins → Add New → Upload** → `dist/premier-visibility-connector.zip` → activate.
2. File Manager → the WordPress site's `wp-config.php` → add, above "That's all, stop editing":
   `define( 'PREMIER_VISIBILITY_KEY', 'a-long-random-string-24-plus-characters' );`
3. Put the same value in the app's `config.php` as `WP_CONNECTOR_KEY`.
4. In the app: **Plugins & updates → Check now**.

The connector only reads: it reports versions and pending updates and never installs or changes anything. Requests without the key are refused.

### 7. At launch
When the real domain goes live, change `SITE_URL` in `config.php`, and edit the four monitors' URLs under Uptime. The staging site is currently set to `noindex, nofollow`, so every page will show a noindex warning until then. That's expected on staging and must be switched off at launch: WordPress → Settings → Reading → untick "Discourage search engines".

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
