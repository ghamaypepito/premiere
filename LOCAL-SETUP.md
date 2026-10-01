# Running this project on your own Mac

The point of working locally is not mainly publishing — pasting two scripts
into a console takes two minutes. It is the **export round trip**. Today
every change needs you to export the site by hand and attach the XML before
anything is safe to touch. Locally that whole cycle can run without you.

## 1. Get the tools

```sh
# Node (if `node --version` says anything under 20, or nothing at all)
brew install node

# Claude Code
npm install -g @anthropic-ai/claude-code
```

## 2. Get the repository

```sh
git clone https://github.com/ghamaypepito/premiere.git
cd premiere
git checkout main-fptmk6
```

`main-fptmk6` is the working branch. `main` does not have any of this.

## 3. Install the dependencies

```sh
npm install
npx playwright install chromium
```

`fast-xml-parser` reads the WordPress export. `playwright` drives a real
browser, which is what makes the preview screenshots and the live-site
checks possible.

## 4. Check it works

```sh
npm run preview     # renders all 17 pages into wp-build/preview/
open wp-build/preview/home.html
```

If that opens a recognisable home page, everything is wired up.

## 5. Start Claude Code

```sh
claude
```

It reads `CLAUDE.md` on startup, so the export-first rule and the publishing
notes come with it.

## What changes once this is running

**Works straight away:**

- `npm run preview` — see changes without touching the live site
- `npm run pull <export.xml>` then `npm run compare` — the drift check, no
  more attaching XML to a chat
- Live-site checks against real pages, with screenshots

**Needs one more piece:** publishing from the command line. That script was
blocked here by a safety rule, since it signs into the live site and
overwrites seventeen pages. See the note at the end of `wp-build/AUTH-TEST.md`.

## Why publishing from a browser works when the API does not

Worth knowing, because it is the thing that took longest to pin down.

Hostinger's CDN strips the `Authorization` header, so application passwords
never reach WordPress — `wp-json/wp/v2/users/me` returns the identical
`rest_not_logged_in` whether you send a wrong password or none at all.

Cookies are not stripped, which is why the site works in a browser. A form
POST to `wp-login.php` carries the credentials in the body and returns a
session cookie. From there the build scripts need nothing else: they fetch an
editor page, scrape their own nonce, and POST to `admin-ajax.php`.

So a driven browser does exactly what your hands do. No REST involved, and
nothing for the CDN to strip.

## Keep the password out of the repository

Whatever runs locally, the WordPress password belongs in the environment and
nowhere else — never in a file here, never in a chat, never on a command line
where it lands in shell history and the process list.

```sh
export WP_USER='your-wp-login'
export WP_PASS='your-password'
```

in a shell you close afterwards. `.gitignore` already covers `.env`, but the
safest file is the one that does not exist.
