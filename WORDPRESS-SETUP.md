# WordPress + Elementor: connection setup

## The staging site

| | |
|---|---|
| Temporary domain | https://white-cassowary-123006.hostingersite.com/ |
| Host | Hostinger |
| Production domain (later) | premierfamilybusiness.com |

Recorded here because it existed nowhere but a browser tab. The build scripts use
relative paths, so they run against whatever domain the tab is on and need no edit at
cutover. `premier-schema.php` derives every URL from `home_url()` for the same reason.

The application password never belongs in this repository. A domain is not a credential;
a password is.


What has to happen on Premier's side before the Elementor build can start. Steps 1 to 3 are
theirs. Step 4 is yours. Step 5 is mine.

---

## 0. Blocking issue, unrelated to the redesign

`premierfamilybusiness.com` currently returns **"There has been a critical error on this website."**
That is a PHP fatal error, not a design problem. Whoever maintains the hosting should look at it
today. It is almost always one of:

- a plugin that fataled after an auto-update (the legacy stack includes Revolution Slider and a
  NitroPack CDN layer, both common culprits),
- a PHP version bump by the host that an old plugin does not support,
- or an exhausted memory limit.

To see the actual error rather than the generic message, add to `wp-config.php`:

```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
```

The error then lands in `wp-content/debug.log`. **Do not build on the broken production site.**

---

## 1. Stand up a staging site

Non-negotiable. The new site replaces the entire information architecture, and the current one is
already down. Most managed hosts (Kinsta, WP Engine, SiteGround, Cloudways) create staging in one
click. Requirements:

| Item | Requirement |
|---|---|
| PHP | 8.1 or newer |
| WordPress | 6.6 or newer |
| Elementor | Elementor **Pro** — the site uses global kits, theme builder header/footer, and popups |
| Flexbox Containers | Must be **enabled**. Elementor > Settings > Features. Templates built on Containers will not render without it |
| Theme | Hello Elementor, or the existing theme with a child theme |
| SSL | Valid certificate, staging included |

---

## 2. Install an MCP server for WordPress

**Read this before picking one.** Automattic's `wordpress-mcp` plugin is being retired. Its own
repository now points to `WordPress/mcp-adapter` as the maintained path. Check the current state of
both before installing, because this space is moving quickly:

- https://github.com/WordPress/mcp-adapter — the ongoing project
- https://github.com/Automattic/wordpress-mcp — being deprecated, still widely referenced
- https://github.com/Automattic/mcp-wordpress-remote — the remote/proxy server

Whichever is current, the shape is the same: a plugin exposes an MCP endpoint on the WordPress REST
API, and a client authenticates against it.

---

## 3. Create an application password

In WordPress admin, as a user with the **Administrator** role:

1. Users > Profile
2. Scroll to **Application Passwords**
3. Name it `Claude MCP`
4. Add Application Password
5. **Copy it immediately.** It is displayed once and never again.

Notes that matter:

- Application Passwords is now treated as the legacy authentication route; OAuth 2.1 is the default
  on the remote server. Application passwords remain the simpler option for a staging site.
- Some servers permit only one MCP application password per account. Re-authorizing revokes the
  previous one.
- Create it on a dedicated admin user, not on Jon's personal account, so it can be revoked without
  locking anyone out.
- Revoke it when the build is finished.

---

## 4. Configure the MCP server — you do this, not me

I must never handle the password. You add the server yourself from an interactive terminal:

```bash
claude mcp add wordpress --scope project
```

Then follow its prompts, or edit the project's `.mcp.json` directly, supplying the site URL, the
admin username, and the application password as environment variables per the chosen server's
README. Confirm it with:

```bash
claude mcp list
```

If you would rather not put the password in a project file, use `--scope user` so it lives in your
own configuration rather than anywhere that could be committed.

Once it connects, tell me and I will pick it up from there.

---

## 5. What I do once connected

In this order. **The order is not optional** — an Elementor template `.json` stores *references* to
global colors and fonts rather than the values themselves, so importing a page before its kit gives
you a page wearing Elementor's default blue and green.

1. **Global kit first.** Global Colors and Global Fonts set from the brand book, then Site Settings:
   content width 1240 px, section padding 88 px desktop and 48 px mobile, button styles, and the
   square-corner rule.
2. **Theme Builder header and footer.** Built once, applied site-wide, including the transparent to
   solid scroll behavior.
3. **Media.** The hero film, its poster frame, and the five photographs, uploaded and named for SEO
   rather than left as `hf_20260909_...`.
4. **Pages, flagship first.** Succession, then Home, then the rest. Succession first because it is
   the page every other page links to.
5. **Custom CSS and the motion script.** Elementor cannot express the stagger, the drawn rules, or
   the accordion spring natively. They ship as one scoped stylesheet plus a small script in a
   custom-code block, keyed off the classes in the prototype.
6. **Schema.** FAQPage on Succession and Governance, HowTo on Approach, Organization and
   LocalBusiness site-wide, Article on Insights.
7. **Redirects.** Every retired URL mapped to its replacement so no existing ranking is dropped.

Steps 2 and 6 are now built and describe the earlier information architecture (Succession,
Governance, Approach, Insights) rather than the one that shipped. See **Theme Builder and
schema — build order** at the end of this file for what actually exists and how to run it.
Step 7, redirects, is still outstanding.

---

## Things I still need from Premier

| Item | Why it is blocking |
|---|---|
| Years in service, families served, consultant count | Currently bracketed. The 2025 figures were 12+, 100+, 40+ and I will not publish stale counts |
| Source for the survival statistic | The page cites a real figure and must link to where it comes from |
| Typical engagement duration | Bracketed on both Succession and Approach |
| Fee range for succession planning | The most searched question in the category. A page that dodges it loses the reader |
| The founding story | One interview with Jon Ramos. It cannot be invented and it is the best paragraph on the Who We Are page |
| Confirmation of the consultant roster | Names and credentials came from the July 2025 archive. People move firms |
| Real photography | Every image in the prototype is generated placeholder |
| Response time for the contact form | Bracketed as one business day |


---

# Theme Builder and schema — build order

Three deliverables were added after the page build. **Run them in this order.** Step 2
publishes pages that no longer carry their own footer, so if step 1 has not been
confirmed working, every page ships without one.

## 1. Header and footer — BLOCKED, see below

**The staging site does not have Elementor Pro.** It runs Elementor 4.3.1 free on the
Hello Elementor theme. Theme Builder is a Pro feature, so the two templates this step
needs cannot be created at all, and the build reported `Found header=null footer=null`
because the library held nothing but Elementor's Default Kit.

**v14 works around it:** the footer is appended to every page at save time instead, in the
build's save loop rather than across seventeen page arrays. The booking dialog rides along
inside it. That restores the footer everywhere without Pro.

What is still missing without Pro:

- The designed header. The site falls back to Hello Elementor's own header and the
  WordPress menu. The `nav-menu` widget the designed header uses is also Pro-only.
- Popups, if any are wanted later.

If Elementor Pro is bought, reverting v14 is one line in `patch-v14.js` and the Theme
Builder route below becomes available again. The original instructions are kept for that.

### Original Theme Builder instructions (needs Pro)

Until now the footer was appended to all 15 page arrays — a footer change meant
re-saving 15 pages. It now ships once, site-wide. The booking dialog lives inside the
footer, so it moves with it.

**First, in the WordPress admin** (about a minute, and it needs Elementor **Pro**):

1. Templates > Theme Builder > Header > **Add New**. Name it `Premier Header`.
2. Close the template library pop-up without picking a block. Save as draft.
3. Set **Display Conditions** to *Entire Site*. Publish.
4. Repeat for Footer, named `Premier Footer`, also *Entire Site*.

Creating them through the admin rather than from a script is deliberate: it lets
WordPress set the template-type meta and the display conditions itself, so the script
only has to fill in content through the same `save_builder` call that already publishes
the pages.

**Then**, logged in as an administrator, paste `wp-build/premier-theme-parts.txt` into
the browser console on any admin page. It finds the two templates by type and fills
them. If it cannot find them it says so and changes nothing.

If more than one header or footer template exists it takes the first. To aim it
explicitly, set the IDs first:

```js
window.__pfbHeaderId = 401; window.__pfbFooterId = 402;
```

The header uses Elementor's `nav-menu` widget, which renders an existing **WordPress**
menu — so links stay editable under Appearance > Menus rather than being frozen into the
design. If it picks the wrong menu, either set `window.__pfbMenu = 'menu-slug'` before
running, or change it in the widget afterwards.

**Confirm the footer renders on a page before going near step 2.**

### One deliberate difference from the prototype

The prototype header is transparent over the cinematic hero and turns solid on scroll.
The Theme Builder header ships **solid navy on every page**, because the transparent
variant could not be previewed against the live pages from here and a transparent header
over a light inner page is unreadable. The behaviour is written and ready — set
`HOME_TRANSPARENT = true` near the top of `premier-theme-parts.txt` and re-run, once
someone can watch it on the home page.

## 2. Republish the pages without their footers

Paste `wp-build/premier-elementor-build.txt` (v10) into the console the usual way. Same
17 pages, same content, footer removed.

Generated by `patch-v10.js`, which refuses to run unless it finds exactly 15 footer call
sites. `premier-elementor-build-v10.txt` is the snapshot.

## 3. Structured data

`wp-build/premier-schema.php` — paste into the child theme's `functions.php`, or add it
as a PHP snippet in WPCode set to run everywhere.

| Markup | Where |
|---|---|
| Organization, WebSite, ProfessionalService (LocalBusiness) | Every page |
| HowTo — the three-step engagement process | Home |
| Article | Every single post, built from WordPress's own title, author, dates, excerpt and featured image |

Article markup is deliberately generic rather than keyed to the four migrated article
slugs, so posts published later are covered without touching the file.

It lives in PHP rather than in Elementor HTML widgets for two reasons: an editor
rearranging a page cannot delete it by accident, and `home_url()` keeps every URL correct
through the move to the production domain.

**FAQPage is not in this file.** It is already embedded in the Elementor content of Family
Enterprise Planning and FAQs, and emitting it twice would duplicate it. That does leave
schema in two places; consolidating it into the PHP is worth doing later, but not while
the embedded version is working.

Verify at https://search.google.com/test/rich-results once it is live.

### Confirm before this goes to production

- **Postal code 6000** for Salinas Drive, Cebu City — standard for Cebu City, but nobody
  at Premier has confirmed it.
- **`+63 917 316 9881`** is the mobile number in E.164 form. The landline
  `+63 32 252 3504` appears on the contact page and in the privacy policy but is not in
  the markup; add it to `telephone` as an array if it should be.
- The privacy policy still carries the **old office address** (9th floor Insular Life
  Building, Cebu Business Park) and a 2020 date. The schema uses the current Cebu
  Exchange Tower address. The policy text should be updated to match.
