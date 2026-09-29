// End-to-end API test against in-memory PGlite and a fake WordPress site.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let site, state = { mode: "ok", title: "Family Business Succession Planning | Premier", robots: "index,follow", pluginVersion: "3.2.0", pluginUpdate: "3.3.0" };
const page = () => `<!doctype html><html lang="en"><head><title>${state.title}</title><meta name="description" content="Succession planning for family businesses.">
<meta name="robots" content="${state.robots}"><link rel="canonical" href="${process.env.SITE_URL}/what-we-do/succession-planning/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Service"},{"@type":"FAQPage"}]}</script></head>
<body><h1>Family business succession planning</h1><h2>How long does it take?</h2><p>Premier helps families.</p><img src="a.jpg" alt=""><a href="/contact/">Book</a></body></html>`;

before(async () => {
  site = http.createServer((req, res) => {
    if (req.url.startsWith("/wp-json/premier-visibility/v1/status")) {
      if (req.headers["x-visibility-key"] !== "k".repeat(30)) { res.statusCode = 401; return res.end("{}"); }
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ core: { version: "6.8.2", update: null }, php: "8.2.1", theme: { name: "Hello Elementor", version: "3.4", update: null },
        plugins: [{ file: "elementor/elementor.php", name: "Elementor", version: state.pluginVersion, active: true, update: state.pluginUpdate, security: false }] }));
    }
    if (state.mode === "fatal") { res.statusCode = 500; return res.end("<p>There has been a critical error on this website.</p>"); }
    res.setHeader("content-type", "text/html"); res.end(page());
  });
  await new Promise((r) => site.listen(0, r));
  process.env.SITE_URL = `http://127.0.0.1:${site.address().port}`;
  process.env.ADMIN_EMAIL = "jon@example.com"; process.env.ADMIN_PASSWORD = "correct-horse-battery";
  process.env.WP_CONNECTOR_KEY = "k".repeat(30);
  delete process.env.DATABASE_URL; delete process.env.PGLITE_DIR;
});
after(() => site.close());

let cookie = "";
async function call(method, path, body) {
  const { handle } = await import("../lib/routes.js");
  const out = await handle({ method, path, body, headers: { cookie, host: "x" }, secure: false });
  if (out.headers?.["set-cookie"]) cookie = out.headers["set-cookie"].split(";")[0];
  return out;
}

test("sign-in, brief versions, conflicts and restore", async () => {
  assert.equal((await call("GET", "/pages")).status, 401);
  assert.equal((await call("POST", "/login", { email: "jon@example.com", password: "wrong" })).status, 401);
  assert.equal((await call("POST", "/login", { email: "jon@example.com", password: "correct-horse-battery" })).status, 200);
  const pages = (await call("GET", "/pages")).body;
  assert.equal(pages.length, 17);
  const { page } = (await call("GET", "/pages/succession")).body;
  const b = { ...page.brief, seoTitle: "Family Business Succession Planning | Premier", h1: "Family business succession planning" };
  const saved = await call("PUT", "/pages/succession", { brief: b, baseVersion: 0, note: "First pass" });
  assert.equal(saved.status, 200); assert.equal(saved.body.page.version, 1);
  assert.equal((await call("PUT", "/pages/succession", { brief: { ...b, owner: "Ana" }, baseVersion: 0 })).status, 409, "stale save must conflict");
  const vers = (await call("GET", "/pages/succession/versions")).body;
  assert.deepEqual(vers[0].changed.sort(), ["h1", "seoTitle"]);
  assert.equal((await call("POST", "/pages/succession/restore", { version: 0 })).body.page.version, 2);
  assert.equal((await call("GET", "/pages/succession")).body.page.brief.seoTitle, "");
});

test("live audit records changes and flags noindex as critical", async () => {
  const a1 = (await call("POST", "/pages/succession/audit")).body;
  assert.equal(a1.status, 200); assert.deepEqual(a1.data.schema, ["FAQPage", "Service"]); assert.equal(a1.data.imagesNoAlt, 1);
  state.robots = "noindex"; state.title = "Succession | Premier";
  const a2 = (await call("POST", "/pages/succession/audit")).body;
  assert.ok(a2.changes.some((c) => c.field === "noindex" && c.severity === "critical"));
  assert.ok(a2.changes.some((c) => c.field === "title"));
  const ev = (await call("GET", "/events")).body;
  assert.ok(ev.some((e) => e.kind === "live" && e.severity === "critical"));
  state.robots = "index,follow";
});

test("uptime opens an incident after two failures and resolves it", async () => {
  const mons = (await call("GET", "/uptime")).body.monitors;
  const home = mons.find((m) => m.name === "Home page");
  state.mode = "fatal";
  let r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.ok, false); assert.equal(r.state, "unknown");
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "down"); assert.match(r.error, /critical error/);
  state.mode = "ok";
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "up");
  const up = (await call("GET", "/uptime")).body;
  assert.equal(up.incidents.length, 1); assert.ok(up.incidents[0].resolved_at);
  const notes = (await call("GET", "/notifications")).body;
  assert.ok(notes.some((n) => /DOWN: Home page/.test(n.subject)), "a notification attempt is logged even with no channel");
});

test("plugin updates are recorded and version changes land in the maintenance log", async () => {
  const r1 = (await call("POST", "/wp/refresh")).body; assert.equal(r1.data.plugins[0].update, "3.3.0");
  state.pluginVersion = "3.3.0"; state.pluginUpdate = null;
  const r2 = (await call("POST", "/wp/refresh")).body; assert.deepEqual(r2.diff.updated, [{ name: "Elementor", from: "3.2.0", to: "3.3.0" }]);
  const log = (await call("GET", "/maintenance")).body; assert.ok(log.some((m) => m.auto && /Elementor 3.2.0 → 3.3.0/.test(m.title)));
});

test("maintenance windows mute alerts", async () => {
  const now = Date.now();
  assert.equal((await call("POST", "/maintenance", { kind: "window", title: "Plugin updates", starts_at: new Date(now - 6e4).toISOString(), ends_at: new Date(now + 36e5).toISOString() })).status, 200);
  const before = (await call("GET", "/notifications")).body.length;
  const home = (await call("GET", "/uptime")).body.monitors.find((m) => m.name === "Home page");
  state.mode = "fatal";
  await call("POST", `/monitors/${home.id}/check`); await call("POST", `/monitors/${home.id}/check`);
  state.mode = "ok";
  await call("POST", `/monitors/${home.id}/check`);
  const afterN = (await call("GET", "/notifications")).body.length;
  assert.equal(afterN, before, "no alerts inside the window");
  const inc = (await call("GET", "/uptime")).body.incidents[0]; assert.equal(inc.in_window, true);
});

test("dashboard and cron auth", async () => {
  const d = (await call("GET", "/dashboard")).body;
  assert.equal(d.trend.length, 90); assert.ok(d.wp.plugins === 1);
  process.env.CRON_SECRET = "s3cret";
  assert.equal((await call("GET", "/cron/uptime")).status, 401);
  delete process.env.CRON_SECRET;
});
