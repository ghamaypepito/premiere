# WordPress + Elementor: connection setup

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
