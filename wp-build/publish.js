#!/usr/bin/env node
/* Publish the build from the command line, doing exactly what pasting into a
   logged-in wp-admin console does.

   The REST API is out (Hostinger's CDN strips Authorization, see AUTH-TEST.md),
   but cookies get through. So: sign in through the wp-login.php form, land on
   a wp-admin page, and evaluate the build scripts there. They scrape their own
   nonce and POST to admin-ajax.php like they always have.

     node wp-build/publish.js --theme                 header + footer templates
     node wp-build/publish.js --pages --only 27,32    just those pages
     node wp-build/publish.js --theme --pages --only 29

   Theme parts always run before pages. --pages refuses to run without --only:
   the client edits live, and a full republish destroys their work. --all is
   the deliberate override.

   Credentials come from WP_USER and WP_PASS in the environment, never argv,
   where they would land in shell history and the process list.

   Before running this, follow the export rule in CLAUDE.md. */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SITE = (process.env.WP_SITE || 'https://white-cassowary-123006.hostingersite.com').replace(/\/$/, '');
const THEME_FILE = path.join(__dirname, 'premier-theme-parts.txt');
const PAGES_FILE = path.join(__dirname, 'premier-elementor-build.txt');

function die(msg) { console.error(msg); process.exit(1); }

function parseArgs(argv) {
  const opts = { theme: false, pages: false, all: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme') opts.theme = true;
    else if (a === '--pages') opts.pages = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--only' || a.startsWith('--only=')) {
      const v = a === '--only' ? argv[++i] : a.slice(7);
      if (!v) die('--only needs a list of page ids, e.g. --only 27,32');
      opts.only = v.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        if (!/^\d+$/.test(s)) die('--only: not a page id: ' + s);
        return Number(s);
      });
    }
    else if (/^--?(user|pass|password|u|p)\b/.test(a)) die('Credentials go in WP_USER / WP_PASS, not on the command line.');
    else die('Unknown argument: ' + a);
  }
  if (opts.only && !opts.pages) opts.pages = true;
  if (!opts.theme && !opts.pages) die('Nothing to do. Pass --theme, --pages --only <ids>, or both.');
  if (opts.pages && !opts.only && !opts.all) die('--pages needs --only <ids>. Republishing all seventeen pages wipes live client edits; pass --all if that is really meant.');
  if (opts.only && opts.all) die('--only and --all contradict each other.');
  return opts;
}

const buildId = src => (src.match(/const BUILD_ID = '([^']+)'/) || [])[1] || '(no BUILD_ID)';

async function login(page, user, pass) {
  await page.goto(SITE + '/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('#wp-submit')
  ]);
  const cookies = await page.context().cookies(SITE);
  if (!cookies.some(c => c.name.startsWith('wordpress_logged_in_'))) {
    const err = await page.locator('#login_error').textContent().catch(() => null);
    throw new Error('Login failed' + (err ? ': ' + err.trim().replace(/\s+/g, ' ') : ' (no session cookie, no error shown)'));
  }
}

/* Each build ends in .then(r => console.log('%c' + r, ...)) or
   .catch(e => console.error('SCRIPT FAILED:', e)). Evaluating the file returns
   that promise, so this waits for it and then reads what it logged. */
async function run(page, label, file, only) {
  const src = fs.readFileSync(file, 'utf8');
  console.log(`\n== ${label}: ${path.basename(file)}  expecting BUILD_ID ${buildId(src)}`);
  await page.goto(SITE + '/wp-admin/', { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/wp-admin/')) throw new Error('Not in wp-admin after login (landed on ' + page.url() + ')');

  const logged = [];
  const onConsole = m => logged.push({ type: m.type(), text: m.text() });
  page.on('console', onConsole);
  try {
    await page.evaluate(({ src, only }) => {
      window.__onlyPages = only || undefined;
      return (0, eval)(src);
    }, { src, only });
  } finally {
    page.off('console', onConsole);
  }

  const result = logged.find(m => m.type === 'log' && m.text.startsWith('%c'));
  const failure = logged.find(m => m.type === 'error' && m.text.startsWith('SCRIPT FAILED'));
  if (failure) throw new Error(failure.text);
  if (!result) throw new Error('The build printed no result.');
  const text = result.text.slice(2).replace(/\s*font-size:13px;line-height:1\.6\s*$/, '');
  console.log(text.split(' | ').map(s => '  ' + s.trim()).join('\n'));

  if (/FAIL|no nonce|Upload these/.test(text)) throw new Error(label + ' did not fully save.');
  if (only) {
    const missing = only.filter(id => !new RegExp('(^|\\| )' + id + ':ok').test(text));
    if (missing.length) throw new Error('Not saved (unknown id, or skipped): ' + missing.join(', '));
  }
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const user = process.env.WP_USER, pass = process.env.WP_PASS;
  if (!user || !pass) die('Set WP_USER and WP_PASS in the environment first.');

  const browser = await chromium.launch();
  let code = 0;
  try {
    const page = await (await browser.newContext()).newPage();
    await login(page, user, pass);
    console.log('Signed in to ' + SITE);
    if (opts.theme) await run(page, 'Theme parts', THEME_FILE, null);
    if (opts.pages) await run(page, 'Pages', PAGES_FILE, opts.only);
  } catch (e) {
    console.error('\n' + e.message);
    code = 1;
  } finally {
    await browser.close();
  }
  process.exit(code);
})();
